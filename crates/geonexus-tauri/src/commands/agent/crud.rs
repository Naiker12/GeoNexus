use tauri::{Emitter, State};
use crate::AppState;
use geonexus_core::agent::Agent;

#[tauri::command]
pub async fn list_agents(state: State<'_, AppState>) -> Result<Vec<Agent>, String> {
    geonexus_db::agent_repo::list_agents(&state.db).await
}

#[tauri::command]
pub async fn toggle_agent(
    agent_id: String,
    active: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if agent_id.trim().is_empty() {
        return Err("agent_id requerido".into());
    }
    geonexus_db::agent_repo::toggle_agent(&state.db, &agent_id, active).await
}

#[tauri::command]
pub async fn set_agent_model(
    agent_id: String,
    model_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    sqlx::query("UPDATE agents SET model_name = ?1, updated_at = ?2 WHERE id = ?3")
        .bind(&model_name)
        .bind(now)
        .bind(&agent_id)
        .execute(&state.db)
        .await
        .map_err(|e| format!("Error al asignar modelo al agente: {e}"))?;
    Ok(())
}

pub fn emit_event(app: &tauri::AppHandle, agent: &str, status: &str, message: &str, data: Option<serde_json::Value>) {
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;
    let payload = serde_json::json!({
        "agent": agent,
        "status": status,
        "message": message,
        "timestamp": now_ms,
        "data": data,
    });
    let _ = app.emit("agent:event", payload);
}
