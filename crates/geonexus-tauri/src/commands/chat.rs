use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use geonexus_core::chat::{
    ChunkReference, Conversation, Message, MessageRole, SendMessageInput, SendMessageResponse,
};
use geonexus_db::chat_repo;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::State;
use uuid::Uuid;

use crate::commands::llm::{project_root, run_sidecar};
use crate::AppState;

/// Responde el sidecar con el formato nuevo (message.content / message.tool_calls)
/// o el legacy (text).
#[derive(Debug, Deserialize)]
struct SidecarChatResult {
    status: String,
    #[serde(default)]
    text: Option<String>,
    /// Nuevo formato: object {role, content, tool_calls}
    /// Error legacy: string
    #[serde(default, alias = "message")]
    msg: Option<serde_json::Value>,
}

impl SidecarChatResult {
    fn content(&self) -> Option<String> {
        // Nuevo: message.content
        if let Some(val) = &self.msg {
            if let Some(obj) = val.as_object() {
                if let Some(c) = obj.get("content").and_then(|c| c.as_str()) {
                    if !c.is_empty() {
                        return Some(c.trim().to_string());
                    }
                }
            }
        }
        // Legacy: text
        self.text.as_ref().map(|s| s.trim().to_string())
    }

    fn tool_calls(&self) -> Option<Vec<serde_json::Value>> {
        match &self.msg {
            Some(serde_json::Value::Object(obj)) => match obj.get("tool_calls") {
                Some(serde_json::Value::Array(arr)) if !arr.is_empty() => Some(arr.clone()),
                _ => None,
            },
            _ => None,
        }
    }

    fn error_message(&self) -> Option<String> {
        if self.status == "ok" {
            return None;
        }
        match &self.msg {
            Some(serde_json::Value::String(s)) => Some(s.clone()),
            _ => None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecallChunk {
    pub text: String,
    pub source: String,
    pub asset_id: String,
    pub score: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecallInput {
    pub project_id: String,
    pub query: String,
    pub top_k: Option<usize>,
    pub collection: Option<String>,
}

// ── Comandos Tauri ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn send_message(
    input: SendMessageInput,
    state: State<'_, AppState>,
) -> Result<SendMessageResponse, String> {
    input.validate()?;

    let trace_id = Uuid::new_v4().to_string();
    let now = unix_now();
    let conversation_id = ensure_conversation(&state, &input).await?;

    // 1. Guardar mensaje del usuario
    let user_msg = Message {
        id: Uuid::new_v4().to_string(),
        conversation_id: conversation_id.clone(),
        role: MessageRole::User,
        content: input.content.trim().to_string(),
        provider: None,
        model: None,
        trace_id: trace_id.clone(),
        chunks_used: vec![],
        nodes_used: vec![],
        tool_calls: vec![],
        sources: vec![],
        created_at: now,
    };

    chat_repo::insert_message(&state.db, &user_msg).await?;

    if input.conversation_id.is_none() {
        let title = title_from_message(&input.content);
        let _ = chat_repo::update_conversation_title(&state.db, &conversation_id, &title).await;
    }

    // 2. RAG context + project context (igual que antes)
    let recall_chunks: Vec<RecallChunk> = run_sidecar_json(&[
        "--action",
        "recall_chunks",
        "--query",
        &input.content,
        "--project_id",
        &input.project_id,
        "--top_k",
        "4",
    ])
    .unwrap_or_default();

    let rag_context = if recall_chunks.is_empty() {
        String::new()
    } else {
        let context_text = recall_chunks
            .iter()
            .enumerate()
            .map(|(i, c)| format!("[{}] {}", i + 1, c.text))
            .collect::<Vec<_>>()
            .join("\n\n");
        format!(
            "Contexto relevante del proyecto (documentos indexados):\n{}\n\n\
             Usa este contexto para responder. Cita el numero de fuente cuando uses informacion de el.",
            context_text
        )
    };

    let project_context = run_sidecar_json::<serde_json::Value>(&[
        "--action",
        "build_project_context",
        "--project_id",
        &input.project_id,
    ])
    .ok()
    .and_then(|v| v["context"].as_str().map(String::from))
    .unwrap_or_default();

    // 3. Tool definitions
    let tools = get_tool_definitions();
    let tools_json = serde_json::to_string(&tools)
        .map_err(|e| format!("Error serializando tools: {e}"))?;

    // 4. Build messages array
    let history = chat_repo::list_messages(&state.db, &conversation_id).await?;
    let mut messages = build_messages(&history, &project_context, &rag_context, &input.content);

    // 5. Tool-calling loop
    let max_iter: usize = 10;
    let mut iteration: usize = 0;
    let final_content: String;

    loop {
        if iteration >= max_iter {
            return Err(
                "El LLM excedio el maximo de llamadas a herramientas (10)".into(),
            );
        }

        let messages_json = serde_json::to_string(&messages)
            .map_err(|e| format!("Error serializando mensajes: {e}"))?;

        let mut sidecar_args: Vec<String> = vec![
            "--action".into(),
            "chat_llm".into(),
            "--provider_type".into(),
            input.provider.clone(),
            "--base_url".into(),
            input.endpoint.clone(),
            "--model".into(),
            input.model.clone(),
            "--messages".into(),
            messages_json,
            "--tools".into(),
            tools_json.clone(),
        ];
        if let Some(ref key) = input.api_key {
            sidecar_args.push("--api_key".into());
            sidecar_args.push(key.clone());
        }

        let output = run_sidecar(
            &sidecar_args.iter().map(String::as_str).collect::<Vec<_>>()
        )?;

        let sidecar: SidecarChatResult = serde_json::from_str(&output)
            .map_err(|e| format!("Error deserializando respuesta LLM: {e}. Output: {output}"))?;

        if sidecar.status != "ok" {
            return Err(sidecar
                .error_message()
                .unwrap_or_else(|| "El proveedor LLM no pudo responder".into()));
        }

        // If the LLM made tool calls, execute them and continue the loop
        if let Some(tool_calls) = sidecar.tool_calls() {
            messages.push(json!({
                "role": "assistant",
                "content": null,
                "tool_calls": tool_calls,
            }));

            for tc in &tool_calls {
                let tool_call_id = tc["id"]
                    .as_str()
                    .unwrap_or("call_unknown")
                    .to_string();
                let result = execute_tool_call(tc);
                messages.push(json!({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": result,
                }));
            }

            iteration += 1;
            continue;
        }

        // No tool calls — extract the text content
        final_content = sidecar
            .content()
            .filter(|c| !c.is_empty())
            .ok_or_else(|| "El LLM devolvio una respuesta vacia".to_string())?;
        break;
    }

    // 6. Guardar mensaje del asistente
    let sources: Vec<String> = recall_chunks
        .iter()
        .map(|c| c.source.clone())
        .collect();

    let assistant_msg = Message {
        id: Uuid::new_v4().to_string(),
        conversation_id: conversation_id.clone(),
        role: MessageRole::Assistant,
        content: final_content,
        provider: Some(input.provider),
        model: Some(input.model),
        trace_id: trace_id.clone(),
        chunks_used: vec![],
        nodes_used: vec![],
        tool_calls: vec![],
        sources,
        created_at: unix_now(),
    };

    chat_repo::insert_message(&state.db, &assistant_msg).await?;

    Ok(SendMessageResponse {
        conversation_id,
        message: assistant_msg,
        chunks_used: Vec::<ChunkReference>::new(),
        trace_id,
    })
}

#[tauri::command]
pub async fn delete_conversation(
    conversation_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if conversation_id.trim().is_empty() {
        return Err("conversation_id requerido".into());
    }
    chat_repo::delete_conversation(&state.db, &conversation_id).await
}

#[tauri::command]
pub async fn list_conversations(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Conversation>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    chat_repo::list_conversations(&state.db, &project_id).await
}

#[tauri::command]
pub async fn list_messages(
    conversation_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Message>, String> {
    if conversation_id.trim().is_empty() {
        return Err("conversation_id requerido".into());
    }
    chat_repo::list_messages(&state.db, &conversation_id).await
}

#[tauri::command]
pub async fn recall_chunks(
    input: RecallInput,
) -> Result<Vec<RecallChunk>, String> {
    if input.project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    if input.query.trim().is_empty() {
        return Err("query requerido".into());
    }

    let top_k = input.top_k.unwrap_or(4);
    let collection = input
        .collection
        .unwrap_or_else(|| "project_memory".into());

    let result: Vec<RecallChunk> = run_sidecar_json(&[
        "--action",
        "recall_chunks",
        "--query",
        &input.query,
        "--project_id",
        &input.project_id,
        "--top_k",
        &top_k.to_string(),
        "--collection",
        &collection,
    ])?;

    Ok(result)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

#[allow(dead_code)]
fn build_prompt(history: &[Message], project_context: &str, rag_context: &str) -> String {
    let mut lines = vec![
        "Eres GeoNexus IA. Responde en espanol claro y con criterio tecnico.".to_string(),
        "Si no tienes contexto documental suficiente, dilo sin inventar citas.".to_string(),
    ];

    if !project_context.is_empty() {
        lines.push(format!("\nResumen del proyecto actual:\n{}", project_context));
    }

    if !rag_context.is_empty() {
        lines.push(rag_context.to_string());
    }

    let start = history.len().saturating_sub(20);
    for message in &history[start..] {
        let role = match message.role {
            MessageRole::User => "Usuario",
            MessageRole::Assistant => "GeoNexus IA",
            MessageRole::Tool => "Tool",
            MessageRole::System => "Sistema",
        };
        lines.push(format!("{role}: {}", message.content.trim()));
    }

    lines.push("GeoNexus IA:".into());
    lines.join("\n")
}

async fn ensure_conversation(
    state: &State<'_, AppState>,
    input: &SendMessageInput,
) -> Result<String, String> {
    if let Some(id) = input.conversation_id.as_ref().filter(|id| !id.trim().is_empty()) {
        return Ok(id.clone());
    }

    let conversation = chat_repo::create_conversation(
        &state.db,
        &input.project_id,
        input.workspace_id.as_deref(),
        &input.provider,
        &input.model,
    )
    .await?;

    Ok(conversation.id)
}

fn title_from_message(content: &str) -> String {
    let trimmed = content.trim();
    let mut title: String = trimmed.chars().take(48).collect();
    if trimmed.chars().count() > 48 {
        title.push_str("...");
    }
    if title.is_empty() {
        "Nueva conversacion".into()
    } else {
        title
    }
}

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

#[derive(Debug, Serialize)]
pub struct ProjectContext {
    pub assets: Vec<ContextAsset>,
    pub graph_nodes: Vec<ContextNode>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ContextAsset {
    pub name: String,
    pub kind: String,
    pub status: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ContextNode {
    pub label: String,
    pub kind: String,
}

#[tauri::command]
pub async fn get_project_context(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<ProjectContext, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }

    let assets: Vec<ContextAsset> = sqlx::query_as::<_, ContextAsset>(
        "SELECT name, kind, status FROM assets
         WHERE workspace_id IN (SELECT id FROM workspaces WHERE project_id = ?)
         AND status = 'indexed'
         LIMIT 10"
    )
    .bind(&project_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| format!("Error consultando assets indexados: {e}"))?;

    let graph_nodes: Vec<ContextNode> = sqlx::query_as::<_, ContextNode>(
        "SELECT label, kind FROM graph_nodes
         WHERE project_id = ?
         LIMIT 8"
    )
    .bind(&project_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| format!("Error consultando nodos del grafo: {e}"))?;

    Ok(ProjectContext { assets, graph_nodes })
}

/// Corre el sidecar y parsea el output como JSON del tipo esperado.
fn run_sidecar_json<T: serde::de::DeserializeOwned>(args: &[&str]) -> Result<T, String> {
    let output = run_sidecar(args)?;
    serde_json::from_str(&output)
        .map_err(|e| format!("Error deserializando respuesta del sidecar: {e}. Output: {output}"))
}

// ── Tool definitions ──────────────────────────────────────────────────────────

fn get_tool_definitions() -> Vec<serde_json::Value> {
    vec![
        json!({
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "Lee el contenido de un archivo del proyecto. Limite: 100 KB.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Ruta relativa al directorio raiz del proyecto"
                        }
                    },
                    "required": ["path"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "search_code",
                "description": "Busca un patron de texto en los archivos del proyecto (como grep). Retorna hasta 20 resultados con ruta, numero de linea y contenido.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "pattern": {
                            "type": "string",
                            "description": "Patron a buscar (case-insensitive)"
                        },
                        "path": {
                            "type": "string",
                            "description": "Subdirectorio donde buscar (opcional, por defecto raiz)"
                        }
                    },
                    "required": ["pattern"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "list_directory",
                "description": "Lista archivos y directorios dentro de una ruta del proyecto.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Ruta relativa al proyecto (por defecto \".\")"
                        }
                    },
                    "required": []
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "glob_files",
                "description": "Busca archivos que coinciden con un patron glob (ej: **/*.rs, src/**/*.ts).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "pattern": {
                            "type": "string",
                            "description": "Patron glob"
                        }
                    },
                    "required": ["pattern"]
                }
            }
        }),
    ]
}

// ── Messages builder ──────────────────────────────────────────────────────────

fn build_messages(
    history: &[Message],
    project_context: &str,
    rag_context: &str,
    user_content: &str,
) -> Vec<serde_json::Value> {
    let mut messages = vec![];

    messages.push(json!({
        "role": "system",
        "content": concat!(
            "Eres GeoNexus IA. Responde en espanol claro y con criterio tecnico. ",
            "Puedes usar las herramientas disponibles para leer archivos y explorar ",
            "el codigo del proyecto cuando sea necesario."
        ),
    }));

    if !project_context.is_empty() {
        messages.push(json!({
            "role": "system",
            "content": format!("Resumen del proyecto actual:\n{}", project_context),
        }));
    }

    if !rag_context.is_empty() {
        messages.push(json!({
            "role": "system",
            "content": rag_context,
        }));
    }

    // Historial (ultimos 20 mensajes)
    let start = history.len().saturating_sub(20);
    for msg in &history[start..] {
        let role = match msg.role {
            MessageRole::User => "user",
            MessageRole::Assistant => "assistant",
            MessageRole::Tool => "tool",
            MessageRole::System => "system",
        };
        let mut entry = json!({
            "role": role,
            "content": msg.content.trim(),
        });
        if !msg.tool_calls.is_empty() {
            entry["tool_calls"] = serde_json::Value::Array(msg.tool_calls.clone());
        }
        messages.push(entry);
    }

    // Mensaje actual del usuario
    messages.push(json!({
        "role": "user",
        "content": user_content.trim(),
    }));

    messages
}

// ── Tool execution ────────────────────────────────────────────────────────────

/// Extensiones de archivo que consideramos texto plano.
const TEXT_EXTENSIONS: &[&str] = &[
    "rs", "ts", "tsx", "js", "jsx", "py", "json", "toml", "md", "css", "html",
    "yml", "yaml", "sql", "sh", "ps1", "bat", "env", "txt", "xml", "svg",
    "vue", "svelte", "astro", "mjs", "cjs", "mts", "cts",
];

fn is_text_file(path: &std::path::Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| TEXT_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// Camina recursivamente hasta `max_depth` recogiendo rutas de archivos de texto.
fn walk_text_files(dir: &PathBuf, root: &PathBuf, max_depth: usize) -> Vec<PathBuf> {
    let mut result = vec![];
    let mut stack = vec![(dir.clone(), 0usize)];
    while let Some((current, depth)) = stack.pop() {
        if depth > max_depth {
            continue;
        }
        if let Ok(entries) = std::fs::read_dir(&current) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.starts_with(root) {
                    continue;
                }
                if let Ok(ft) = entry.file_type() {
                    if ft.is_dir() {
                        // Skip hidden directories
                        if entry
                            .file_name()
                            .to_str()
                            .map(|s| s.starts_with('.'))
                            .unwrap_or(false)
                        {
                            continue;
                        }
                        stack.push((path, depth + 1));
                    } else if ft.is_file() && is_text_file(&path) {
                        // Also skip hidden files
                        if entry
                            .file_name()
                            .to_str()
                            .map(|s| s.starts_with('.'))
                            .unwrap_or(false)
                        {
                            continue;
                        }
                        result.push(path);
                    }
                }
            }
        }
    }
    result
}

fn execute_tool_call(tc: &serde_json::Value) -> String {
    let name = tc["function"]["name"].as_str().unwrap_or("").to_string();
    let args_str = tc["function"]["arguments"]
        .as_str()
        .unwrap_or("{}");
    let args: serde_json::Value =
        serde_json::from_str(args_str).unwrap_or(json!({}));

    let root = project_root();

    match name.as_str() {
        "read_file" => cmd_read_file(&args, &root),
        "search_code" => cmd_search_code(&args, &root),
        "list_directory" => cmd_list_directory(&args, &root),
        "glob_files" => cmd_glob_files(&args, &root),
        _ => format!("Error: herramienta desconocida '{name}'"),
    }
}

fn cmd_read_file(args: &serde_json::Value, root: &PathBuf) -> String {
    let path = args["path"].as_str().unwrap_or("");
    if path.is_empty() {
        return "Error: path requerido".into();
    }
    let full_path = root.join(path);
    if !full_path.starts_with(root) {
        return "Error: path fuera del directorio del proyecto".into();
    }
    match std::fs::read_to_string(&full_path) {
        Ok(content) => {
            if content.len() > 100_000 {
                let truncated: String = content.chars().take(100_000).collect();
                format!("{}...(truncado, {} caracteres totales)", truncated, content.len())
            } else {
                content
            }
        }
        Err(e) => format!("Error al leer archivo: {e}"),
    }
}

fn cmd_search_code(args: &serde_json::Value, root: &PathBuf) -> String {
    let pattern = args["pattern"].as_str().unwrap_or("");
    if pattern.is_empty() {
        return "Error: pattern requerido".into();
    }

    let subpath = args["path"].as_str().unwrap_or("");
    let search_dir = if subpath.is_empty() {
        root.clone()
    } else {
        root.join(subpath)
    };

    if !search_dir.starts_with(root) {
        return "Error: path fuera del directorio del proyecto".into();
    }

    let pattern_lower = pattern.to_lowercase();
    let files = walk_text_files(&search_dir, root, 4);
    let mut results: Vec<String> = vec![];

    'files: for file in &files {
        let Ok(content) = std::fs::read_to_string(file) else {
            continue;
        };
        let rel = file.strip_prefix(root).unwrap_or(file);
        for (i, line) in content.lines().enumerate() {
            if line.to_lowercase().contains(&pattern_lower) {
                results.push(format!(
                    "{}:{}: {}",
                    rel.display(),
                    i + 1,
                    line.trim()
                ));
                if results.len() >= 20 {
                    break 'files;
                }
            }
        }
    }

    if results.is_empty() {
        format!("No se encontraron resultados para: {pattern}")
    } else {
        results.join("\n")
    }
}

fn cmd_list_directory(args: &serde_json::Value, root: &PathBuf) -> String {
    let path = args["path"].as_str().unwrap_or(".");
    let full_path = root.join(path);
    if !full_path.starts_with(root) {
        return "Error: path fuera del directorio del proyecto".into();
    }

    match std::fs::read_dir(&full_path) {
        Ok(entries) => {
            let mut items: Vec<String> = entries
                .filter_map(|e| e.ok())
                .map(|e| {
                    let name = e.file_name().to_string_lossy().to_string();
                    let kind = if e.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                        "DIR"
                    } else {
                        "FILE"
                    };
                    format!("  [{kind}] {name}")
                })
                .collect();
            items.sort();
            let mut out = format!("Contenido de {}:\n", full_path.display());
            out.push_str(&items.join("\n"));
            out
        }
        Err(e) => format!("Error al listar directorio: {e}"),
    }
}

fn cmd_glob_files(args: &serde_json::Value, root: &PathBuf) -> String {
    let pattern = args["pattern"].as_str().unwrap_or("");
    if pattern.is_empty() {
        return "Error: pattern requerido".into();
    }

    // Simple glob: separamos en partes, soportamos ** y *
    // Recorremos todos los archivos de texto y vemos si el path relativo
    // coincide con el patron.
    let all_files = walk_text_files(root, root, 5);
    let mut matches: Vec<String> = vec![];

    for file in &all_files {
        let rel = file.strip_prefix(root).unwrap_or(file).to_string_lossy();
        // Normalizar separadores a /
        let rel_normalized = rel.replace('\\', "/");
        if simple_glob_match(&rel_normalized, pattern) {
            matches.push(rel_normalized);
        }
        if matches.len() >= 50 {
            break;
        }
    }

    if matches.is_empty() {
        format!("No se encontraron archivos para: {pattern}")
    } else {
        matches.join("\n")
    }
}

/// Coincidencia glob simple: soporta `*` y `**`.
fn simple_glob_match(name: &str, pattern: &str) -> bool {
    let name = name.replace('\\', "/").to_lowercase();
    let pattern = pattern.replace('\\', "/").to_lowercase();

    if pattern.contains("**") {
        let parts: Vec<&str> = pattern.split("**").collect();
        if parts.len() == 2 {
            let prefix = parts[0].trim_end_matches('/');
            let suffix = parts[1].trim_start_matches('/');
            return name.starts_with(prefix) && name.ends_with(suffix);
        }
        return name.starts_with(&pattern);
    }

    if pattern.contains('*') {
        let parts: Vec<&str> = pattern.split('*').collect();
        if parts.len() == 2 {
            return name.starts_with(parts[0]) && name.ends_with(parts[1]);
        }
    }

    name == pattern
}

#[cfg(test)]
mod tests {
    use super::*;
    use geonexus_core::chat::MessageRole;

    fn msg(role: MessageRole, content: &str) -> Message {
        Message {
            id: "id".into(),
            conversation_id: "conv-1".into(),
            role,
            content: content.into(),
            provider: None,
            model: None,
            trace_id: "trace".into(),
            chunks_used: vec![],
            nodes_used: vec![],
            tool_calls: vec![],
            sources: vec![],
            created_at: 1000,
        }
    }

    // ── title_from_message ───────────────────────────────────────────────────

    #[test]
    fn title_from_message_recorta_a_48_caracteres() {
        let long = "a".repeat(100);
        let title = title_from_message(&long);
        assert_eq!(title.len(), 48 + 3); // 48 chars + "..."
        assert!(title.ends_with("..."));
    }

    #[test]
    fn title_from_message_no_agrega_puntos_si_cabe_justo() {
        let exact = "a".repeat(48);
        let title = title_from_message(&exact);
        assert_eq!(title.len(), 48);
        assert!(!title.ends_with("..."));
    }

    #[test]
    fn title_from_message_corto_pasa_sin_cambios() {
        let title = title_from_message("Hola mundo");
        assert_eq!(title, "Hola mundo");
    }

    #[test]
    fn title_from_message_vacio_da_titulo_default() {
        assert_eq!(title_from_message(""), "Nueva conversacion");
        assert_eq!(title_from_message("   "), "Nueva conversacion");
    }

    #[test]
    fn title_from_message_trimmea_espacios() {
        let title = title_from_message("  Hola mundo  ");
        assert_eq!(title, "Hola mundo");
    }

    // ── build_prompt ─────────────────────────────────────────────────────────

    #[test]
    fn build_prompt_incluye_system_prompt_siempre() {
        let prompt = build_prompt(&[], "", "");
        assert!(prompt.contains("GeoNexus IA"));
        assert!(prompt.contains("espanol claro"));
    }

    #[test]
    fn build_prompt_incluye_project_context_cuando_no_vacio() {
        let prompt = build_prompt(&[], "Tres assets indexados", "");
        assert!(prompt.contains("Resumen del proyecto actual"));
        assert!(prompt.contains("Tres assets indexados"));
    }

    #[test]
    fn build_prompt_incluye_rag_context_cuando_no_vacio() {
        let prompt = build_prompt(&[], "", "[1] Documento relevante sobre uso de suelo");
        assert!(prompt.contains("Documento relevante"));
    }

    #[test]
    fn build_prompt_no_incluye_project_context_si_vacio() {
        let prompt = build_prompt(&[], "", "");
        assert!(!prompt.contains("Resumen del proyecto"));
    }

    #[test]
    fn build_prompt_incluye_historia_con_roles() {
        let history = vec![
            msg(MessageRole::User, "Cual es la altura maxima?"),
            msg(MessageRole::Assistant, "La altura maxima es 15 metros."),
        ];
        let prompt = build_prompt(&history, "", "");
        assert!(prompt.contains("Usuario: Cual es la altura maxima?"));
        assert!(prompt.contains("GeoNexus IA: La altura maxima es 15 metros."));
    }

    #[test]
    fn build_prompt_limita_historia_a_20_ultimos() {
        let mut history = vec![];
        for i in 0..30 {
            history.push(msg(MessageRole::User, &format!("Mensaje {i}")));
        }
        let prompt = build_prompt(&history, "", "");
        // Should not contain the first 10 messages
        assert!(!prompt.contains("Mensaje 0"));
        assert!(!prompt.contains("Mensaje 9"));
        // Should contain the last 10 messages
        assert!(prompt.contains("Mensaje 10"));
        assert!(prompt.contains("Mensaje 29"));
    }

    #[test]
    fn build_prompt_termina_con_geo_nexus_ia() {
        let prompt = build_prompt(&[], "", "");
        assert!(prompt.ends_with("GeoNexus IA:"));
    }

    #[test]
    fn build_prompt_incluye_ambos_contextos_juntos() {
        let prompt = build_prompt(&[], "Assets: capa-uso-suelo", "[1] chunk sobre normativa");
        assert!(prompt.contains("Resumen del proyecto"));
        assert!(prompt.contains("chunk sobre normativa"));
    }

    // ── run_sidecar_json ─────────────────────────────────────────────────────

    #[test]
    fn run_sidecar_json_falla_si_sidecar_no_existe() {
        let result: Result<Vec<i32>, String> = run_sidecar_json(&["--accion", "no_existe"]);
        assert!(result.is_err());
    }
}
