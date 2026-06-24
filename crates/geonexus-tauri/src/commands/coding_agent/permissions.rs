use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::oneshot;
use tauri::Manager;

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

#[tauri::command]
pub async fn coding_agent_resolve_permission(
    permission_id: String,
    approved: bool,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let perm_state = app.state::<PermissionState>();
    let mut lock = perm_state.pending.lock().map_err(|e| e.to_string())?;
    if let Some(sender) = lock.remove(&permission_id) {
        sender.send(approved).map_err(|_| "El receptor de permisos ya cerró".to_string())?;
    }
    Ok(())
}
