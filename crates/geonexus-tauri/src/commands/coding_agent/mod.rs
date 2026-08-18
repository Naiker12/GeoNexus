use std::path::PathBuf;
use tauri::{Emitter, Manager};
use serde_json::json;

pub mod types;
pub mod permissions;
mod llm;
mod files;

use types::{LLMPlan, LLMPlanFile};
use llm::{call_llm_for_plan, call_llm_for_clarification};
use files::{get_project_context_text, collect_project_files};

/// Obtiene el FilesystemMcpFacade del estado de Tauri.
fn get_fs_facade<'a>(app: &'a tauri::AppHandle) -> tauri::State<'a, geonexus_fs_mcp::facade::FilesystemMcpFacade> {
    app.state::<geonexus_fs_mcp::facade::FilesystemMcpFacade>()
}

#[tauri::command]
pub async fn coding_agent_clarify(
    description: String,
    provider_type: String,
    model: String,
    endpoint: String,
    api_key: Option<String>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let questions = call_llm_for_clarification(
        &description, &provider_type, &model, &endpoint, api_key.as_deref(),
    ).await?;

    app.emit("agent:clarifying_questions", json!({
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
    app: tauri::AppHandle,
) -> Result<String, String> {
    if description.trim().is_empty() {
        return Err("La descripcion no puede estar vacia".into());
    }

    let state = app.state::<crate::AppState>();
    let bus = &state.event_bus;
    let session_id = conversation_id.clone().unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    bus.emit(geonexus_core::events::GeoEvent {
        id: uuid::Uuid::new_v4().to_string(),
        session_id: session_id.clone(),
        timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::PipelineStarted,
        payload: json!({ "goal": description }),
    }).await;

    let planner_event_id = uuid::Uuid::new_v4().to_string();
    let planner_start_time = std::time::SystemTime::now();
    bus.emit(geonexus_core::events::GeoEvent {
        id: planner_event_id.clone(),
        session_id: session_id.clone(),
        timestamp: planner_start_time.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::WorkerStarted,
        payload: json!({ "worker": "planner", "task": description }),
    }).await;

    let project_name = project_path.split('/').last().unwrap_or("proyecto");

    app.emit("agent:step_start", json!({
        "id": "step-plan",
        "label": format!("Analizando objetivo: {}", &description),
        "detail": "Usando LLM para generar plan..."
    })).map_err(|e| e.to_string())?;

    let facade = get_fs_facade(&app);
    let project_context = get_project_context_text(&project_path, &facade).await;

    let plan = if provider_type.is_empty() || model.is_empty() || endpoint.is_empty() {
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
    bus.emit(geonexus_core::events::GeoEvent {
        id: planner_event_id,
        session_id: session_id.clone(),
        timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::WorkerCompleted,
        payload: json!({ "worker": "planner", "duration_ms": planner_duration, "result_summary": plan.summary }),
    }).await;

    app.emit("agent:step_complete", json!({
        "id": "step-plan",
        "duration": planner_duration
    })).map_err(|e| e.to_string())?;

    let workspace_event_id = uuid::Uuid::new_v4().to_string();
    let workspace_start_time = std::time::SystemTime::now();
    bus.emit(geonexus_core::events::GeoEvent {
        id: workspace_event_id.clone(),
        session_id: session_id.clone(),
        timestamp: workspace_start_time.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::WorkerStarted,
        payload: json!({ "worker": "workspace", "task": format!("Creando estructura en {}", project_name) }),
    }).await;

    app.emit("agent:step_start", json!({
        "id": "step-workspace",
        "label": format!("Preparando directorio {}", project_name),
        "detail": &project_path
    })).map_err(|e| e.to_string())?;

    let _base_path = PathBuf::from(&project_path);
    facade.dispatch("createFolder", json!({"path": &project_path}), "coding-agent").await
        .map_err(|e| format!("Error creando directorio: {}", e))?;

    app.emit("agent:file_created", json!({
        "path": &project_path,
        "name": project_name,
        "type": "directory",
        "status": "done",
        "language": ""
    })).map_err(|e| e.to_string())?;

    let workspace_duration = workspace_start_time.elapsed().unwrap_or_default().as_millis() as u64;
    bus.emit(geonexus_core::events::GeoEvent {
        id: workspace_event_id,
        session_id: session_id.clone(),
        timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::WorkerCompleted,
        payload: json!({ "worker": "workspace", "duration_ms": workspace_duration, "result_summary": format!("Directorio {} listo", project_name) }),
    }).await;

    app.emit("agent:step_complete", json!({
        "id": "step-workspace",
        "duration": workspace_duration
    })).map_err(|e| e.to_string())?;

    let plan_files: Vec<serde_json::Value> = plan.files.iter().map(|f| {
        json!({
            "path": f.path,
            "language": f.language,
            "shortDescription": f.short_description,
            "content": f.content,
            "risk": f.risk,
            "reason": f.reason,
        })
    }).collect();

    let plan_json = json!({
        "summary": plan.summary,
        "files": plan_files,
    });

    app.emit("agent:plan_generated", plan_json.clone()).map_err(|e| e.to_string())?;

    Ok(plan_json.to_string())
}

#[tauri::command]
pub async fn coding_agent_approve_plan(
    plan_json: String,
    project_path: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let plan: LLMPlan = serde_json::from_str(&plan_json)
        .map_err(|e| format!("Error parseando plan: {}", e))?;

    let facade = get_fs_facade(&app);
    let state = app.state::<crate::AppState>();
    let bus = &state.event_bus;
    let session_id = uuid::Uuid::new_v4().to_string();

    let file_event_id = uuid::Uuid::new_v4().to_string();
    let file_start_time = std::time::SystemTime::now();
    bus.emit(geonexus_core::events::GeoEvent {
        id: file_event_id.clone(),
        session_id: session_id.clone(),
        timestamp: file_start_time.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::WorkerStarted,
        payload: json!({ "worker": "file_generation", "task": "Generando archivos del plan" }),
    }).await;

    app.emit("agent:step_start", json!({
        "id": "step-files",
        "label": "Generando archivos...",
        "detail": format!("{} archivos por crear", plan.files.len())
    })).map_err(|e| e.to_string())?;

    let mut created_count = 0usize;
    let mut overwrite_count = 0usize;

    for file in &plan.files {
        let full_path = PathBuf::from(&project_path).join(&file.path);

        if facade.path_guard().validate(&full_path).is_err() {
            return Err(format!("Ruta no permitida: {}", file.path));
        }

        let exists = full_path.exists();

        app.emit("agent:file_created", json!({
            "path": &file.path,
            "name": full_path.file_name().and_then(|n| n.to_str()).unwrap_or(""),
            "type": "file",
            "status": "generating",
            "language": &file.language
        })).map_err(|e| e.to_string())?;

        if let Some(parent) = full_path.parent() {
            let _ = tokio::fs::create_dir_all(parent).await;
        }
        tokio::fs::write(&full_path, &file.content).await
            .map_err(|e| format!("Error escribiendo {}: {}", file.path, e))?;

        app.emit("agent:file_created", json!({
            "path": &file.path,
            "name": full_path.file_name().and_then(|n| n.to_str()).unwrap_or(""),
            "type": "file",
            "status": "done",
            "language": &file.language
        })).map_err(|e| e.to_string())?;

        if exists { overwrite_count += 1; } else { created_count += 1; }
    }

    let file_duration = file_start_time.elapsed().unwrap_or_default().as_millis() as u64;
    bus.emit(geonexus_core::events::GeoEvent {
        id: file_event_id,
        session_id,
        timestamp: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as i64,
        event_type: geonexus_core::events::EventType::WorkerCompleted,
        payload: json!({ "worker": "file_generation", "duration_ms": file_duration, "result_summary": format!("{} creados, {} sobrescritos", created_count, overwrite_count) }),
    }).await;

    app.emit("agent:step_complete", json!({
        "id": "step-files",
        "duration": file_duration
    })).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn coding_agent_load_project(
    project_path: String,
    app: tauri::AppHandle,
) -> Result<Vec<types::ProjectFileEntry>, String> {
    let facade = get_fs_facade(&app);
    let path = PathBuf::from(&project_path);
    Ok(collect_project_files(&path, "", &facade).await)
}
