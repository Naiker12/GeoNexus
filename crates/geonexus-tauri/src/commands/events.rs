use tauri::{command, State, AppHandle, Emitter};
use geonexus_core::events::{BusEvent, Domain, Artifact};
use crate::AppState;

#[command]
pub async fn list_events(
    state: State<'_, AppState>,
    domain: Option<String>,
    conversation_id: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<BusEvent>, String> {
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    geonexus_db::event_repo::list_events(
        &state.db,
        domain.as_deref(),
        conversation_id.as_deref(),
        limit,
        offset,
    )
    .await
    .map_err(|e| e.to_string())
}

#[command]
pub async fn count_events(
    state: State<'_, AppState>,
    domain: Option<String>,
    conversation_id: Option<String>,
) -> Result<i64, String> {
    geonexus_db::event_repo::count_events(&state.db, domain.as_deref(), conversation_id.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn list_artifacts(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Artifact>, String> {
    geonexus_db::artifact_repo::list_artifacts(&state.db, &session_id, 100, 0)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn open_artifact(
    artifact_id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let artifact = geonexus_db::artifact_repo::get_artifact(&state.db, &artifact_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Artifact no encontrado".to_string())?;

    if let Some(path) = &artifact.path {
        use tauri_plugin_opener::OpenerExt;
        app.opener().open_path(path, None::<&str>).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("El artifact no tiene una ruta en filesystem".to_string())
    }
}

#[command]
pub async fn get_artifact_content(
    artifact_id: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let artifact = geonexus_db::artifact_repo::get_artifact(&state.db, &artifact_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Artifact no encontrado".to_string())?;

    if let Some(content) = artifact.content {
        Ok(content)
    } else if let Some(path) = artifact.path {
        tokio::fs::read_to_string(path)
            .await
            .map_err(|e| format!("Error leyendo archivo de disco: {}", e))
    } else {
        Ok(String::new())
    }
}

#[command]
pub async fn delete_artifact(
    state: State<'_, AppState>,
    id: String,
) -> Result<bool, String> {
    let bus = state.event_bus.clone();
    let deleted = geonexus_db::artifact_repo::delete_artifact(&state.db, &id)
        .await
        .map_err(|e| e.to_string())?;
    if deleted {
        bus.publish(BusEvent::new(
            Domain::Artifact,
            "deleted",
            serde_json::json!({ "id": id }),
            "delete_artifact",
        ));
    }
    Ok(deleted)
}

#[command]
pub async fn subscribe_events(
    session_id: String,
    window: tauri::Window,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut rx = state.event_bus.subscribe();
    
    tokio::spawn(async move {
        while let Ok(event) = rx.recv().await {
            if event.session_id == session_id {
                let _ = window.emit("geo:event", &event);
            }
        }
    });
    
    Ok(())
}

#[command]
pub async fn list_geo_events(
    state: State<'_, AppState>,
    session_id: String,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<geonexus_core::events::GeoEvent>, String> {
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);
    geonexus_db::geo_event_repo::list_geo_events(&state.db, &session_id, limit, offset)
        .await
        .map_err(|e| e.to_string())
}

pub fn start_event_forwarder(
    app_handle: &AppHandle,
    bus: &geonexus_core::events::EventBus,
    db: sqlx::SqlitePool,
) {
    let app = app_handle.clone();
    let mut rx = bus.subscribe_legacy();
    let db_legacy = db.clone();
    tauri::async_runtime::spawn(async move {
        while let Ok(event) = rx.recv().await {
            // Persistir a SQLite
            let _ = geonexus_db::event_repo::insert_event(&db_legacy, &event).await;

            // Reenviar al frontend via Tauri event system
            let domain = event.domain.as_str();
            let event_name = format!("bus:{domain}:{action}", action = event.action);
            let _ = app.emit(&event_name, &event);
            let _ = app.emit("bus:event", &event);
        }
    });
}

