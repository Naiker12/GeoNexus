use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::oneshot;
use serde_json::json;
use crate::commands::llm::run_sidecar;
use crate::AppState;

/// Obtiene el FilesystemMcpFacade del estado de Tauri.
fn get_fs_facade<'a>(app: &'a AppHandle) -> State<'a, geonexus_fs_mcp::facade::FilesystemMcpFacade> {
    app.state::<geonexus_fs_mcp::facade::FilesystemMcpFacade>()
}

pub struct PermissionState {
    pub pending: Arc<std::sync::Mutex<HashMap<String, oneshot::Sender<bool>>>>,
}

impl PermissionState {
    pub fn new() -> Self {
        Self { pending: Arc::new(std::sync::Mutex::new(HashMap::new())) }
    }
}

impl Default for PermissionState {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct LLMPlanFile {
    path: String,
    language: String,
    short_description: String,
    content: String,
    risk: String,
    reason: String,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct LLMPlan {
    summary: String,
    files: Vec<LLMPlanFile>,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct ProjectFileEntry {
    path: String,
    name: String,
    type_: String,
    content: String,
    language: String,
    is_original: bool,
}

/// Llama al LLM via sidecar para generar un plan estructurado
async fn call_llm_for_plan(
    description: &str,
    project_context: &str,
    provider_type: &str,
    model: &str,
    endpoint: &str,
    api_key: Option<&str>,
) -> Result<LLMPlan, String> {
    let system_prompt = format!(
        r#"Eres un agente de codigo experto. Tu tarea es analizar el requerimiento del usuario y producir un plan detallado.

Contexto del proyecto actual:
{}

Principio fundamental: MINIMO CODIGO NECESARIO.
Antes de proponer cualquier archivo, recorre esta escalera:
  1. ?Esto necesita construirse? Si es especulativo, no lo incluyas.
  2. ?La libreria estandar ya lo hace? Usala (CSS nativo, HTML semantico, JS vanilla).
  3. ?Una caracteristica nativa de HTML/CSS cubre esto? Preferila (ej: <input type="date"> en vez de date picker externo).
  4. ?Puede ser una linea? Que sea una linea.
  5. Solo entonces: escribe el minimo codigo que funcione.

Sin abstracciones no solicitadas, sin dependencias nuevas evitables,
sin boilerplate que nadie pidio. Prefiere borrar sobre anadir.

Reglas:
1. Devuelve SOLO JSON valido, sin explicaciones ni markdown adicional.
2. El JSON debe tener esta estructura exacta:
{{
  "summary": "Resumen de lo que se va a construir",
  "files": [
    {{
      "path": "ruta/del/archivo",
      "language": "html|css|js|ts|py|rs|json|md|etc",
      "shortDescription": "que hace este archivo",
      "content": "contenido completo del archivo",
      "risk": "low" si es un archivo nuevo en agent-projects, "high" si sobrescribe algo existente,
      "reason": "por que se crea o modifica este archivo"
    }}
  ]
}}

EXCEPCION CRITICA: La regla de "minimo codigo" NO aplica a:
  - Validacion de entrada en limites de confianza
  - Manejo de errores que previene perdida de datos
  - Seguridad (sanitizacion, escapado, permisos)
  - Accesibilidad (aria, semantic HTML, contraste)
  - NADA explicitamente solicitado por el usuario
En estos casos, escribe el codigo completo y correcto, aunque sea mas largo.

Requerimiento del usuario: {}
"#,
        project_context, description
    );

    let messages = serde_json::json!([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": description}
    ]);

    let mut args = vec![
        "--action".to_string(),
        "chat_llm".to_string(),
        "--provider_type".to_string(),
        provider_type.to_string(),
        "--base_url".to_string(),
        endpoint.to_string(),
        "--model".to_string(),
        model.to_string(),
        "--messages".to_string(),
        messages.to_string(),
    ];

    if let Some(key) = api_key {
        if !key.is_empty() {
            args.push("--api_key".to_string());
            args.push(key.to_string());
        }
    }

    let output = run_sidecar(
        &args.iter().map(String::as_str).collect::<Vec<_>>(),
    )?;

    let parsed: serde_json::Value = serde_json::from_str(&output)
        .map_err(|e| format!("Error parseando respuesta del LLM: {}. Output: {}", e, &output[..output.len().min(500)]))?;

    if parsed.get("status").and_then(|s| s.as_str()) == Some("error") {
        let msg = parsed.get("message").and_then(|m| m.as_str()).unwrap_or("Error desconocido del LLM");
        return Err(format!("LLM error: {}", msg));
    }

    let message = parsed.get("message")
        .or_else(|| parsed.get("msg"))
        .ok_or_else(|| format!("Respuesta LLM sin campo 'message'. Output: {}", &output[..output.len().min(500)]))?;

    let content = message.get("content")
        .and_then(|c| c.as_str())
        .ok_or_else(|| format!("Respuesta LLM sin contenido. Output: {}", &output[..output.len().min(500)]))?;

    // Extraer JSON del contenido (puede venir envuelto en ```json ... ```)
    let content = content.trim();
    let json_str = if content.starts_with("```") {
        let lines: Vec<&str> = content.lines().collect();
        let start = if lines.first().map_or(false, |l| l.starts_with("```")) { 1 } else { 0 };
        let end = if lines.last().map_or(false, |l| l.starts_with("```")) {
            if lines.len() > start { lines.len() - 1 } else { lines.len() }
        } else {
            lines.len()
        };
        lines[start..end].join("\n")
    } else {
        content.to_string()
    };

    let plan: LLMPlan = serde_json::from_str(&json_str)
        .map_err(|e| format!("Error parseando plan JSON del LLM: {}. JSON: {}", e, &json_str[..json_str.len().min(300)]))?;

    Ok(plan)
}

/// Obtiene el contexto del proyecto activo (archivos cargados) para pasarselo al LLM
/// Valida la ruta via FilesystemMcpFacade antes de leer.
async fn get_project_context_text(
    project_path: &str,
    facade: &geonexus_fs_mcp::facade::FilesystemMcpFacade,
) -> String {
    let base = PathBuf::from(project_path);

    // Validate through facade's path guard
    if facade.path_guard().validate(&base).is_err() {
        return "Proyecto no accesible (fuera de las rutas permitidas).".to_string();
    }

    if !base.exists() {
        return "Proyecto nuevo (sin archivos existentes).".to_string();
    }

    let mut parts = Vec::new();
    if let Ok(mut entries) = tokio::fs::read_dir(&base).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if let Ok(content) = tokio::fs::read_to_string(&path).await {
                        let preview: String = content.chars().take(200).collect();
                        parts.push(format!("--- {}:\n{}", name, preview));
                    }
                }
            }
        }
    }

    if parts.is_empty() {
        "Proyecto nuevo (directorio vacio).".to_string()
    } else {
        format!("Archivos existentes en el proyecto:\n{}", parts.join("\n"))
    }
}

/// Recolecta archivos de un directorio (recursivamente, ignorando carpetas no deseadas)
/// Valida cada subdirectorio via FilesystemMcpFacade antes de recorrerlo.
async fn collect_project_files(
    dir: &PathBuf,
    base_prefix: &str,
    facade: &geonexus_fs_mcp::facade::FilesystemMcpFacade,
) -> Vec<ProjectFileEntry> {
    let mut entries = Vec::new();
    let ignore_dirs = ["node_modules", "target", ".git", "dist", "build", "chroma_db", ".venv", "__pycache__"];

    // Validate this directory through facade path guard
    if facade.path_guard().validate(dir).is_err() {
        return entries;
    }

    if let Ok(mut read_dir) = tokio::fs::read_dir(dir).await {
        while let Ok(Some(entry)) = read_dir.next_entry().await {
            let path = entry.path();
            let file_name = entry.file_name().to_string_lossy().to_string();

            if ignore_dirs.contains(&file_name.as_str()) {
                continue;
            }

            let relative = if base_prefix.is_empty() {
                file_name.clone()
            } else {
                format!("{}/{}", base_prefix, file_name)
            };

            if path.is_dir() {
                let children = Box::pin(collect_project_files(&path, &relative, facade)).await;
                entries.push(ProjectFileEntry {
                    path: relative.clone(),
                    name: file_name,
                    type_: "directory".to_string(),
                    content: String::new(),
                    language: String::new(),
                    is_original: true,
                });
                entries.extend(children);
            } else if path.is_file() {
                let content = tokio::fs::read_to_string(&path).await.unwrap_or_default();
                let ext = path.extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_string();
                let language = match ext.as_str() {
                    "html" | "htm" => "html",
                    "css" => "css",
                    "js" | "mjs" => "javascript",
                    "ts" | "tsx" => "typescript",
                    "jsx" => "jsx",
                    "py" => "python",
                    "rs" => "rust",
                    "json" => "json",
                    "md" => "markdown",
                    "toml" => "toml",
                    "yaml" | "yml" => "yaml",
                    "sql" => "sql",
                    "sh" | "bash" => "shell",
                    _ => "text",
                }.to_string();
                entries.push(ProjectFileEntry {
                    path: relative,
                    name: file_name,
                    type_: "file".to_string(),
                    content,
                    language,
                    is_original: true,
                });
            }
        }
    }
    entries
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct ClarifyingQuestion {
    id: String,
    question: String,
    answer: String,
}

/// Llama al LLM para generar preguntas aclaratorias sobre el requerimiento
async fn call_llm_for_clarification(
    description: &str,
    provider_type: &str,
    model: &str,
    endpoint: &str,
    api_key: Option<&str>,
) -> Result<Vec<ClarifyingQuestion>, String> {
    let json_example = r#"{
  "questions": [
    {
      "id": "q1",
      "question": "Texto de la pregunta"
    }
  ]
}"#;
    let system_prompt = format!(
        "Eres un analista de requerimientos experto. Tu tarea es generar preguntas aclaratorias\npara entender mejor lo que el usuario necesita construir.\n\nReglas:\n1. Genera entre 2 y 4 preguntas relevantes sobre el proyecto.\n2. Las preguntas deben ayudar a definir: alcance, tecnologia, diseno, funcionalidades.\n3. Devuelve SOLO JSON valido, sin explicaciones ni markdown.\n4. El JSON debe tener esta estructura exacta:\n{}\n\nRequerimiento del usuario: {}",
        json_example,
        description
    );

    let messages = serde_json::json!([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": description}
    ]);

    let mut args = vec![
        "--action".to_string(),
        "chat_llm".to_string(),
        "--provider_type".to_string(),
        provider_type.to_string(),
        "--base_url".to_string(),
        endpoint.to_string(),
        "--model".to_string(),
        model.to_string(),
        "--messages".to_string(),
        messages.to_string(),
    ];

    if let Some(key) = api_key {
        if !key.is_empty() {
            args.push("--api_key".to_string());
            args.push(key.to_string());
        }
    }

    let output = run_sidecar(
        &args.iter().map(String::as_str).collect::<Vec<_>>(),
    )?;

    let parsed: serde_json::Value = serde_json::from_str(&output)
        .map_err(|e| format!("Error parseando respuesta del LLM: {}. Output: {}", e, &output[..output.len().min(500)]))?;

    if parsed.get("status").and_then(|s| s.as_str()) == Some("error") {
        let msg = parsed.get("message").and_then(|m| m.as_str()).unwrap_or("Error desconocido del LLM");
        return Err(format!("LLM error: {}", msg));
    }

    let message = parsed.get("message")
        .or_else(|| parsed.get("msg"))
        .ok_or_else(|| format!("Respuesta LLM sin campo 'message'. Output: {}", &output[..output.len().min(500)]))?;

    let content = message.get("content")
        .and_then(|c| c.as_str())
        .ok_or_else(|| format!("Respuesta LLM sin contenido. Output: {}", &output[..output.len().min(500)]))?;

    let content = content.trim();
    let json_str = if content.starts_with("```") {
        let lines: Vec<&str> = content.lines().collect();
        let start = if lines.first().map_or(false, |l| l.starts_with("```")) { 1 } else { 0 };
        let end = if lines.last().map_or(false, |l| l.starts_with("```")) {
            if lines.len() > start { lines.len() - 1 } else { lines.len() }
        } else {
            lines.len()
        };
        lines[start..end].join("\n")
    } else {
        content.to_string()
    };

    #[derive(serde::Deserialize)]
    struct QuestionsResponse {
        questions: Vec<ClarifyingQuestion>,
    }

    let resp: QuestionsResponse = serde_json::from_str(&json_str)
        .map_err(|e| format!("Error parseando preguntas del LLM: {}. JSON: {}", e, &json_str[..json_str.len().min(300)]))?;

    Ok(resp.questions)
}

// ──────────────────────────────────────────────────────────
// Tauri Commands
// ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn coding_agent_clarify(
    description: String,
    provider_type: String,
    model: String,
    endpoint: String,
    api_key: Option<String>,
    app: AppHandle,
) -> Result<String, String> {
    let questions = call_llm_for_clarification(
        &description,
        &provider_type,
        &model,
        &endpoint,
        api_key.as_deref(),
    ).await?;

    app.emit("agent:clarifying_questions", serde_json::json!({
        "questions": questions
    })).map_err(|e| e.to_string())?;

    Ok(serde_json::to_string(&questions).unwrap_or_default())
}

#[tauri::command]
pub async fn coding_agent_start_generation(
    description: String,
    project_path: String,
    provider_type: String,
    model: String,
    endpoint: String,
    api_key: Option<String>,
    conversation_id: Option<String>,
    app: AppHandle,
) -> Result<String, String> {
    if description.trim().is_empty() {
        return Err("La descripcion no puede estar vacia".into());
    }

    let state = app.state::<AppState>();
    let bus = &state.event_bus;
    let session_id = conversation_id.clone().unwrap_or_else(|| "default-session".to_string());

    // Emit PipelineStarted
    bus.emit(geonexus_core::events::GeoEvent {
        id: uuid::Uuid::new_v4().to_string(),
        session_id: session_id.clone(),
        timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::PipelineStarted,
        payload: serde_json::json!({ "goal": description }),
    }).await;

    // Emit WorkerStarted for planner
    let planner_event_id = uuid::Uuid::new_v4().to_string();
    let planner_start_time = std::time::SystemTime::now();
    bus.emit(geonexus_core::events::GeoEvent {
        id: planner_event_id.clone(),
        session_id: session_id.clone(),
        timestamp: planner_start_time.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::WorkerStarted,
        payload: serde_json::json!({ "worker": "planner", "task": description }),
    }).await;

    let project_name = project_path.split('/').last().unwrap_or("proyecto");

    // PASO 1: Thinking (analizando)
    let reasoning_start = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let _ = app.emit("reasoning:start", serde_json::json!({ "session_id": session_id }));
    let _ = app.emit("reasoning:step", serde_json::json!({
        "id": "planning",
        "agent_name": "Coding Agent",
        "agent_type": "code",
        "status": "running",
        "label": format!("Planificando: {}", &description),
        "sub_items": [],
        "duration_ms": null,
        "started_at": reasoning_start,
        "completed_at": null,
    }));
    app.emit("agent:step_start", serde_json::json!({
        "id": "step-plan",
        "label": format!("Analizando objetivo: {}", &description),
        "detail": format!("Usando LLM para generar plan...")
    })).map_err(|e| e.to_string())?;

    // Obtener contexto del proyecto existente (validado via facade)
    let facade = get_fs_facade(&app);
    let project_context = get_project_context_text(&project_path, &facade).await;

    // Llamar al LLM
    let plan = if provider_type.is_empty() || model.is_empty() || endpoint.is_empty() {
        // Fallback: si no hay LLM configurado, crear plan basico
        LLMPlan {
            summary: format!("Proyecto: {}", description),
            files: vec![LLMPlanFile {
                path: "index.html".to_string(),
                language: "html".to_string(),
                short_description: "Pagina principal".to_string(),
                content: format!("<!DOCTYPE html>\n<html lang=\"es\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>{}</title>\n</head>\n<body>\n  <h1>{}</h1>\n  <p>Proyecto generado con GeoNexus</p>\n</body>\n</html>", description, description),
                risk: "low".to_string(),
                reason: "Archivo principal del proyecto".to_string(),
            }],
        }
    } else {
        call_llm_for_plan(&description, &project_context, &provider_type, &model, &endpoint, api_key.as_deref()).await?
    };

    let planner_duration = planner_start_time.elapsed().unwrap_or_default().as_millis() as u64;
    // Emit WorkerCompleted for planner
    bus.emit(geonexus_core::events::GeoEvent {
        id: planner_event_id,
        session_id: session_id.clone(),
        timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::WorkerCompleted,
        payload: serde_json::json!({ "worker": "planner", "duration_ms": planner_duration, "result_summary": plan.summary }),
    }).await;

    let now_unix = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
    let _ = app.emit("reasoning:step", serde_json::json!({
        "id": "planning",
        "agent_name": "Coding Agent",
        "agent_type": "code",
        "status": "success",
        "label": format!("Plan generado: {} archivos", plan.files.len()),
        "sub_items": [],
        "duration_ms": planner_duration,
        "started_at": reasoning_start,
        "completed_at": now_unix,
    }));

    app.emit("agent:step_complete", serde_json::json!({
        "id": "step-plan",
        "duration": planner_duration
    })).map_err(|e| e.to_string())?;

    // Emit WorkerStarted for workspace
    let workspace_event_id = uuid::Uuid::new_v4().to_string();
    let workspace_start_time = std::time::SystemTime::now();
    bus.emit(geonexus_core::events::GeoEvent {
        id: workspace_event_id.clone(),
        session_id: session_id.clone(),
        timestamp: workspace_start_time.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::WorkerStarted,
        payload: serde_json::json!({ "worker": "workspace", "task": format!("Creando estructura en {}", project_name) }),
    }).await;

    // PASO 2: Workspace (preparar directorio)
    app.emit("agent:step_start", serde_json::json!({
        "id": "step-workspace",
        "label": format!("Preparando directorio {}", project_name),
        "detail": &project_path
    })).map_err(|e| e.to_string())?;

    // Crear directorio via FilesystemMcpFacade
    let _base_path = PathBuf::from(&project_path);
    facade.dispatch("createFolder", json!({"path": &project_path}), "coding-agent").await
        .map_err(|e| format!("Error creando directorio: {}", e))?;

    app.emit("agent:file_created", serde_json::json!({
        "path": &project_path,
        "name": project_name,
        "type": "directory",
        "status": "done",
        "language": ""
    })).map_err(|e| e.to_string())?;

    let workspace_duration = workspace_start_time.elapsed().unwrap_or_default().as_millis() as u64;
    // Emit WorkerCompleted for workspace
    bus.emit(geonexus_core::events::GeoEvent {
        id: workspace_event_id,
        session_id: session_id.clone(),
        timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::WorkerCompleted,
        payload: serde_json::json!({ "worker": "workspace", "duration_ms": workspace_duration, "result_summary": format!("Directorio {} listo", project_name) }),
    }).await;

    app.emit("agent:step_complete", serde_json::json!({
        "id": "step-workspace",
        "duration": workspace_duration
    })).map_err(|e| e.to_string())?;

    // Emitir plan para revision del usuario
    let plan_files: Vec<serde_json::Value> = plan.files.iter().map(|f| {
        serde_json::json!({
            "path": f.path,
            "language": f.language,
            "shortDescription": f.short_description,
            "content": f.content,
            "risk": f.risk,
            "reason": f.reason
        })
    }).collect();

    let plan_payload = serde_json::json!({
        "summary": plan.summary,
        "files": plan_files
    });

    app.emit("agent:plan_ready", plan_payload.clone())
        .map_err(|e| e.to_string())?;

    let _ = app.emit("reasoning:end", serde_json::json!({
        "session_id": session_id,
        "total_ms": planner_duration,
    }));

    // Emitir evento thinking resumido
    app.emit("agent:thinking", serde_json::json!({
        "text": format!("Plan generado: {} archivo(s) propuesto(s)", plan.files.len())
    })).map_err(|e| e.to_string())?;

    Ok(serde_json::to_string(&plan_payload).unwrap_or_default())
}

#[tauri::command]
pub async fn coding_agent_approve_plan(
    plan_json: String,
    project_path: String,
    conversation_id: Option<String>,
    app: AppHandle,
) -> Result<String, String> {
    let plan: LLMPlan = serde_json::from_str(&plan_json)
        .map_err(|e| format!("Error parseando plan: {}", e))?;

    let state = app.state::<AppState>();
    let bus = &state.event_bus;
    let session_id = conversation_id.clone().unwrap_or_else(|| "default-session".to_string());

    // Emit WorkerStarted for coding
    let coding_event_id = uuid::Uuid::new_v4().to_string();
    let coding_start_time = std::time::SystemTime::now();
    bus.emit(geonexus_core::events::GeoEvent {
        id: coding_event_id.clone(),
        session_id: session_id.clone(),
        timestamp: coding_start_time.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::WorkerStarted,
        payload: serde_json::json!({ "worker": "coding", "task": format!("Generando {} componentes", plan.files.len()) }),
    }).await;

    let base_path = PathBuf::from(&project_path);
    let facade = get_fs_facade(&app);
    facade.dispatch("createFolder", json!({"path": &project_path}), "coding-agent").await
        .map_err(|e| format!("Error creando directorio: {}", e))?;

    let _ = app.emit("reasoning:start", serde_json::json!({ "session_id": session_id }));

    let file_count = plan.files.len();
    let coding_reasoning_start = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let _ = app.emit("reasoning:step", serde_json::json!({
        "id": "writing",
        "agent_name": "Coding Agent",
        "agent_type": "code",
        "status": "running",
        "label": format!("Generando {} archivo{}", file_count, if file_count == 1 { "" } else { "s" }),
        "sub_items": [],
        "duration_ms": null,
        "started_at": coding_reasoning_start,
        "completed_at": null,
    }));
    app.emit("agent:step_start", serde_json::json!({
        "id": "step-coding",
        "label": format!("Generando {} archivo{}", file_count, if file_count == 1 { "" } else { "s" }),
    })).map_err(|e| e.to_string())?;

    let perm_state = app.state::<PermissionState>();
    let mut files_written = 0usize;

    for spec in &plan.files {
        let full_path = base_path.join(&spec.path);
        let full_path_str = full_path.to_string_lossy().to_string();

        // Crear directorio padre via FilesystemMcpFacade si es necesario
        if let Some(parent) = full_path.parent() {
            let parent_str = parent.to_string_lossy().to_string();
            if !parent.exists() {
                facade.dispatch("createFolder", json!({"path": parent_str}), "coding-agent").await
                    .map_err(|e| format!("Error creando directorio {}: {}", parent.display(), e))?;
            }
        }

        // Si el archivo existe, pedir permiso y esperar respuesta
        if full_path.exists() {
            let perm_id = format!("perm-{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or(std::time::Duration::from_secs(0)).as_millis());
            let (tx, rx) = oneshot::channel::<bool>();
            {
                let mut map = perm_state.pending.lock().map_err(|e| e.to_string())?;
                map.insert(perm_id.clone(), tx);
            }
            app.emit("agent:permission_required", serde_json::json!({
                "id": perm_id,
                "action": "overwrite",
                "targetPath": spec.path,
                "reason": spec.reason
            })).map_err(|e| e.to_string())?;

            // Esperar respuesta del usuario con timeout de 60s
            let granted = match tokio::time::timeout(std::time::Duration::from_secs(60), rx).await {
                Ok(Ok(g)) => g,
                _ => false, // timeout o canal caido = denegar
            };

            // Limpiar del mapa pendiente si aun esta
            {
                let mut map = perm_state.pending.lock().map_err(|e| e.to_string())?;
                map.remove(&perm_id);
            }

            if !granted {
                app.emit("agent:file_created", serde_json::json!({
                    "path": &spec.path,
                    "name": spec.path.split('/').last().unwrap_or(&spec.path),
                    "type": "file",
                    "status": "skipped",
                    "reason": "Permiso denegado por el usuario"
                })).map_err(|e| e.to_string())?;
                continue;
            }
        }

        // Emitir evento de inicio de escritura
        let file_name = spec.path.split('/').last().unwrap_or(&spec.path);
        app.emit("agent:file_writing_start", serde_json::json!({
            "path": &spec.path,
            "name": file_name,
            "language": &spec.language,
        })).map_err(|e| e.to_string())?;

        // Emitir chunks de contenido progresivamente
        let content = &spec.content;
        let chunk_size = 80;
        let mut emitted = 0usize;
        while emitted < content.len() {
            let end = std::cmp::min(emitted + chunk_size, content.len());
            let chunk = &content[emitted..end];
            app.emit("agent:file_content_chunk", serde_json::json!({
                "path": &spec.path,
                "chunk": chunk,
            })).map_err(|e| e.to_string())?;
            emitted = end;
            tokio::time::sleep(std::time::Duration::from_millis(5)).await;
        }

        // Escribir el archivo via FilesystemMcpFacade (pasa por PathGuard, LevelGuard, RateGuard)
        let tool = if full_path.exists() { "updateFile" } else { "createFile" };
        facade.dispatch(tool, json!({"path": full_path_str, "content": &spec.content}), "coding-agent").await
            .map_err(|e| format!("Error escribiendo {}: {}", spec.path, e))?;

        let total_lines = content.lines().count();
        app.emit("agent:file_writing_done", serde_json::json!({
            "path": &spec.path,
            "name": file_name,
            "totalLines": total_lines,
        })).map_err(|e| e.to_string())?;

        app.emit("agent:file_created", serde_json::json!({
            "path": &spec.path,
            "name": file_name,
            "type": "file",
            "language": &spec.language,
            "status": "done",
            "reason": &spec.reason
        })).map_err(|e| e.to_string())?;

        // ── Artifact Creation in DB & EventBus ──
        let artifact_id = uuid::Uuid::new_v4().to_string();
        
        let artifact_type = match spec.language.as_str() {
            "html" | "htm" => geonexus_core::events::ArtifactType::Code,
            "css" => geonexus_core::events::ArtifactType::Code,
            "js" | "jsx" | "ts" | "tsx" => {
                if spec.path.contains("Dashboard") || spec.path.contains("dashboard") {
                    geonexus_core::events::ArtifactType::Dashboard
                } else {
                    geonexus_core::events::ArtifactType::Code
                }
            }
            "json" => geonexus_core::events::ArtifactType::Code,
            "geojson" => geonexus_core::events::ArtifactType::GeoJson,
            "csv" => geonexus_core::events::ArtifactType::Csv,
            "pdf" => geonexus_core::events::ArtifactType::Pdf,
            "png" | "jpg" | "jpeg" => geonexus_core::events::ArtifactType::Image,
            _ => geonexus_core::events::ArtifactType::Code,
        };

        let metadata = serde_json::json!({
            "language": spec.language,
            "description": spec.reason,
            "line_count": total_lines,
            "status": "done"
        });

        let artifact = geonexus_core::events::Artifact {
            id: artifact_id.clone(),
            session_id: session_id.clone(),
            name: file_name.to_string(),
            artifact_type,
            path: Some(spec.path.clone()),
            content: Some(spec.content.clone()),
            metadata: metadata.clone(),
            created_at: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs() as i64,
        };

        if let Err(err) = geonexus_db::artifact_repo::insert_artifact(&state.db, &artifact).await {
            eprintln!("[ERROR] Error insertando artifact: {}", err);
        }

        // Emit legacy BusEvent
        bus.publish(geonexus_core::events::BusEvent::new(
            geonexus_core::events::Domain::Artifact,
            "created",
            json!({
                "id": artifact_id,
                "name": file_name,
                "artifact_type": "code",
                "path": spec.path,
                "content": spec.content,
                "language": spec.language,
                "description": spec.reason,
                "line_count": total_lines,
                "status": "done",
                "conversation_id": conversation_id,
                "created_at": artifact.created_at,
                "updated_at": artifact.created_at,
            }),
            "coding_agent",
        ).with_conversation(&session_id));

        // Emit GeoEvent for ArtifactCreated
        bus.emit(geonexus_core::events::GeoEvent {
            id: uuid::Uuid::new_v4().to_string(),
            session_id: session_id.clone(),
            timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
            event_type: geonexus_core::events::EventType::ArtifactCreated,
            payload: json!({
                "artifact_id": artifact_id,
                "name": file_name,
                "type": serde_json::to_string(&artifact.artifact_type).unwrap_or_default().trim_matches('"'),
            }),
        }).await;

        files_written += 1;
        let _ = app.emit("reasoning:sub_item", serde_json::json!({
            "id": "writing",
            "text": format!("✓ {} ({} líneas)", spec.path, total_lines),
        }));
    }

    let coding_duration = coding_start_time.elapsed().unwrap_or_default().as_millis() as u64;
    // Emit WorkerCompleted for coding
    bus.emit(geonexus_core::events::GeoEvent {
        id: coding_event_id,
        session_id: session_id.clone(),
        timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::WorkerCompleted,
        payload: serde_json::json!({ "worker": "coding", "duration_ms": coding_duration, "result_summary": format!("Generados {} archivos", files_written) }),
    }).await;

    // Emit PipelineCompleted
    bus.emit(geonexus_core::events::GeoEvent {
        id: uuid::Uuid::new_v4().to_string(),
        session_id: session_id.clone(),
        timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::PipelineCompleted,
        payload: serde_json::json!({ "status": "completed", "files_written": files_written }),
    }).await;

    let now_unix = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
    let _ = app.emit("reasoning:step", serde_json::json!({
        "id": "writing",
        "agent_name": "Coding Agent",
        "agent_type": "code",
        "status": "success",
        "label": format!("{} archivos generados", files_written),
        "sub_items": [],
        "duration_ms": coding_duration,
        "started_at": coding_reasoning_start,
        "completed_at": now_unix,
    }));
    let _ = app.emit("reasoning:end", serde_json::json!({
        "session_id": session_id,
        "total_ms": coding_duration,
    }));

    app.emit("agent:step_complete", serde_json::json!({
        "id": "step-coding",
        "duration": coding_duration
    })).map_err(|e| e.to_string())?;

    app.emit("agent:done", serde_json::json!({}))
        .map_err(|e| e.to_string())?;

    Ok(format!("Plan ejecutado: {} archivos creados", files_written))
}

#[tauri::command]
pub async fn coding_agent_resolve_permission(
    request_id: String,
    granted: bool,
    app: AppHandle,
) -> Result<(), String> {
    let perm_state = app.state::<PermissionState>();
    let tx = {
        let mut map = perm_state.pending.lock().map_err(|e| e.to_string())?;
        map.remove(&request_id)
    };
    if let Some(tx) = tx {
        let _ = tx.send(granted);
    }
    app.emit("agent:permission_resolved", serde_json::json!({
        "id": request_id,
        "granted": granted
    })).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn coding_agent_load_project(
    path: String,
    app: AppHandle,
) -> Result<String, String> {
    let project_path = PathBuf::from(&path);

    if !project_path.exists() {
        return Err(format!("La ruta no existe: {}", path));
    }

    let project_name = project_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("proyecto")
        .to_string();

    app.emit("agent:thinking", serde_json::json!({
        "text": format!("Analizando proyecto {}...", project_name)
    })).map_err(|e| e.to_string())?;

    let facade = get_fs_facade(&app);
    let files = collect_project_files(&project_path, "", &facade).await;

    // Contar lenguajes detectados
    let mut lang_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for f in &files {
        if f.type_ == "file" && !f.language.is_empty() && f.language != "text" {
            *lang_counts.entry(f.language.clone()).or_insert(0) += 1;
        }
    }

    let mut lang_summary: Vec<String> = lang_counts
        .into_iter()
        .map(|(lang, count)| format!("{} ({} archivos)", lang, count))
        .collect();
    lang_summary.sort();

    let file_count = files.iter().filter(|f| f.type_ == "file").count();
    let dir_count = files.iter().filter(|f| f.type_ == "directory").count();

    let langs = if lang_summary.is_empty() {
        "ninguno detectado".to_string()
    } else {
        lang_summary.join(", ")
    };
    let summary = format!(
        "Proyecto analizado: {} archivos, {} directorios. Lenguajes detectados: {}",
        file_count, dir_count, langs
    );

    let loaded_files: Vec<serde_json::Value> = files.iter().map(|f| {
        serde_json::json!({
            "path": f.path,
            "name": f.name,
            "type": f.type_,
            "content": f.content,
            "language": f.language,
            "isOriginal": f.is_original,
            "status": "done"
        })
    }).collect();

    let payload = serde_json::json!({
        "name": project_name,
        "summary": summary,
        "files": loaded_files
    });

    app.emit("agent:project_loaded", payload.clone())
        .map_err(|e| e.to_string())?;

    Ok(summary)
}
