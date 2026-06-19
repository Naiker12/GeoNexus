use tauri::{command, State, AppHandle, Emitter};
use geonexus_core::events::{BusEvent, Domain};
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
    state: State<'_, AppState>,
    conversation_id: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<geonexus_core::events::Artifact>, String> {
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    geonexus_db::artifact_repo::list_artifacts(&state.db, conversation_id.as_deref(), limit, offset)
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn list_artifact_summaries(
    state: State<'_, AppState>,
    conversation_id: Option<String>,
) -> Result<Vec<geonexus_core::events::ArtifactSummary>, String> {
    geonexus_db::artifact_repo::list_artifact_summaries(&state.db, conversation_id.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_artifact(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<geonexus_core::events::Artifact>, String> {
    geonexus_db::artifact_repo::get_artifact(&state.db, &id)
        .await
        .map_err(|e| e.to_string())
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

pub fn start_event_forwarder(
    app_handle: &AppHandle,
    bus: &geonexus_core::events::EventBus,
    db: sqlx::SqlitePool,
) {
    let app = app_handle.clone();
    let mut rx = bus.subscribe();
    tauri::async_runtime::spawn(async move {
        while let Ok(event) = rx.recv().await {
            // Persistir a SQLite
            let _ = geonexus_db::event_repo::insert_event(&db, &event).await;

            // Reenviar al frontend via Tauri event system
            let domain = event.domain.as_str();
            let event_name = format!("bus:{domain}:{action}", action = event.action);
            let _ = app.emit(&event_name, &event);
            let _ = app.emit("bus:event", &event);
        }
    });
}
