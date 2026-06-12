use uuid::Uuid;
use geonexus_core::SyncEventType;

pub(crate) fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub(crate) async fn insert_sync_event(
    pool: &sqlx::SqlitePool,
    project_id: &str,
    workspace_id: Option<&str>,
    connector_id: Option<&str>,
    asset_id: Option<&str>,
    event_type: SyncEventType,
    detail: Option<String>,
    trace_id: Option<&str>,
) {
    let id = Uuid::new_v4().to_string();
    let now = unix_now();
    let trace_str = trace_id.unwrap_or("");
    let event_type_str = serde_json::to_string(&event_type)
        .unwrap_or_default()
        .trim_matches('"')
        .to_string();

    let _ = sqlx::query(
        "INSERT INTO sync_events (id, project_id, workspace_id, connector_id, asset_id, agent_id, event_type, detail, trace_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(id)
    .bind(project_id)
    .bind(workspace_id)
    .bind(connector_id)
    .bind(asset_id)
    .bind(None::<String>) // agent_id
    .bind(event_type_str)
    .bind(detail)
    .bind(trace_str)
    .bind(now)
    .execute(pool)
    .await;
}
