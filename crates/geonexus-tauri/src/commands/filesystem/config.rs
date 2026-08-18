use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_filesystem_config() -> Result<geonexus_fs_mcp::config::FilesystemConfig, String> {
    let config = geonexus_fs_mcp::config::FilesystemConfig::load()
        .map_err(|e| format!("Failed to load filesystem config: {e}"))?;
    Ok(config)
}

#[tauri::command]
pub async fn save_filesystem_config(
    config: geonexus_fs_mcp::config::FilesystemConfig,
) -> Result<(), String> {
    config.save()
        .map_err(|e| format!("Failed to save filesystem config: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn is_first_launch(state: State<'_, AppState>) -> Result<bool, String> {
    let db = &state.db;
    let row: Option<String> = sqlx::query_scalar(
        "SELECT value FROM app_settings WHERE key = 'onboarding_completed'"
    )
    .fetch_optional(db)
    .await
    .map_err(|e| format!("DB error: {e}"))?;

    match row {
        Some(val) => Ok(val != "true"),
        None => Ok(true),
    }
}

#[tauri::command]
pub async fn set_onboarding_completed(state: State<'_, AppState>) -> Result<(), String> {
    let db = &state.db;
    sqlx::query(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('onboarding_completed', 'true')"
    )
    .execute(db)
    .await
    .map_err(|e| format!("DB error: {e}"))?;
    Ok(())
}
