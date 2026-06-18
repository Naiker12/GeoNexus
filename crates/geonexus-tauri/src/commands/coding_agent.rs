use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use crate::commands::llm::run_sidecar;

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct LLMPlanFile {
    path: String,
    language: String,
    short_description: String,
    content: String,
    risk: String,
    reason: String,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
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

Reglas:
1. Devuelve SOLO JSON valido, sin explicaciones ni markdown adicional.
2. El JSON debe tener esta estructura exacta:
{{
  "summary": "Resumen de lo que se va a construir",
  "files": [
    {{
      "path": "ruta/del/archivo",
      "language": "html|css|js|ts|py|rs|json|md|etc",
      "short_description": "que hace este archivo",
      "content": "contenido completo del archivo",
      "risk": "low" si es un archivo nuevo en agent-projects, "high" si sobrescribe algo existente,
      "reason": "por que se crea o modifica este archivo"
    }}
  ]
}}

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
fn get_project_context_text(project_path: &str) -> String {
    let base = PathBuf::from(project_path);
    if !base.exists() {
        return "Proyecto nuevo (sin archivos existentes).".to_string();
    }

    let mut parts = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&base) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if let Ok(content) = std::fs::read_to_string(&path) {
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
fn collect_project_files(dir: &PathBuf, base_prefix: &str) -> Vec<ProjectFileEntry> {
    let mut entries = Vec::new();
    let ignore_dirs = ["node_modules", "target", ".git", "dist", "build", "chroma_db", ".venv", "__pycache__"];

    if let Ok(read_dir) = std::fs::read_dir(dir) {
        for entry in read_dir.flatten() {
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
                let children = collect_project_files(&path, &relative);
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
                let content = std::fs::read_to_string(&path).unwrap_or_default();
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

// ──────────────────────────────────────────────────────────
// Tauri Commands
// ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn coding_agent_start_generation(
    description: String,
    project_path: String,
    provider_type: String,
    model: String,
    endpoint: String,
    api_key: Option<String>,
    app: AppHandle,
) -> Result<String, String> {
    if description.trim().is_empty() {
        return Err("La descripcion no puede estar vacia".into());
    }

    let project_name = project_path.split('/').last().unwrap_or("proyecto");

    // PASO 1: Thinking (analizando)
    app.emit("agent:step_start", serde_json::json!({
        "id": "step-plan",
        "label": format!("Analizando objetivo: {}", &description),
        "detail": format!("Usando LLM para generar plan...")
    })).map_err(|e| e.to_string())?;

    // Obtener contexto del proyecto existente
    let project_context = get_project_context_text(&project_path);

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

    app.emit("agent:step_complete", serde_json::json!({
        "id": "step-plan",
        "duration": 0
    })).map_err(|e| e.to_string())?;

    // PASO 2: Workspace (preparar directorio)
    app.emit("agent:step_start", serde_json::json!({
        "id": "step-workspace",
        "label": format!("Preparando directorio {}", project_name),
        "detail": &project_path
    })).map_err(|e| e.to_string())?;

    // Crear directorio si no existe
    let base_path = PathBuf::from(&project_path);
    std::fs::create_dir_all(&base_path).map_err(|e| format!("Error creando directorio: {}", e))?;

    app.emit("agent:file_created", serde_json::json!({
        "path": &project_path,
        "name": project_name,
        "type": "directory",
        "status": "done",
        "language": ""
    })).map_err(|e| e.to_string())?;

    app.emit("agent:step_complete", serde_json::json!({
        "id": "step-workspace",
        "duration": 0
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
    app: AppHandle,
) -> Result<String, String> {
    let plan: LLMPlan = serde_json::from_str(&plan_json)
        .map_err(|e| format!("Error parseando plan: {}", e))?;

    let base_path = PathBuf::from(&project_path);
    std::fs::create_dir_all(&base_path).map_err(|e| format!("Error creando directorio: {}", e))?;

    let file_count = plan.files.len();
    app.emit("agent:step_start", serde_json::json!({
        "id": "step-coding",
        "label": format!("Generando {} archivo{}", file_count, if file_count == 1 { "" } else { "s" }),
    })).map_err(|e| e.to_string())?;

    for spec in &plan.files {
        let full_path = base_path.join(&spec.path);

        // Crear directorio padre si es necesario
        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Error creando directorio {}: {}", parent.display(), e))?;
        }

        // Verificar riesgo alto
        if full_path.exists() {
            let perm_id = format!("perm-{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or(std::time::Duration::from_secs(0)).as_millis());
            app.emit("agent:permission_required", serde_json::json!({
                "id": perm_id,
                "action": "overwrite",
                "targetPath": spec.path,
                "reason": spec.reason
            })).map_err(|e| e.to_string())?;
        }

        std::fs::write(&full_path, &spec.content)
            .map_err(|e| format!("Error escribiendo {}: {}", spec.path, e))?;

        app.emit("agent:file_created", serde_json::json!({
            "path": &spec.path,
            "name": &spec.path.split('/').last().unwrap_or(&spec.path),
            "type": "file",
            "language": &spec.language,
            "content": &spec.content,
            "status": "done",
            "reason": &spec.reason
        })).map_err(|e| e.to_string())?;
    }

    app.emit("agent:step_complete", serde_json::json!({
        "id": "step-coding",
        "duration": 0
    })).map_err(|e| e.to_string())?;

    app.emit("agent:done", serde_json::json!({}))
        .map_err(|e| e.to_string())?;

    Ok(format!("Plan ejecutado: {} archivos creados", file_count))
}

#[tauri::command]
pub async fn coding_agent_resolve_permission(
    request_id: String,
    granted: bool,
    app: AppHandle,
) -> Result<(), String> {
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

    let files = collect_project_files(&project_path, "");

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
