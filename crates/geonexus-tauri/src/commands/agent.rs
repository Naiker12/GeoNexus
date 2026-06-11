use tauri::State;
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
