use serde::Serialize;
use tauri::{command, State};

use crate::AppState;
use crate::commands::llm::get_global_gateway;

#[derive(Debug, Serialize)]
pub struct HealthCheckResult {
    pub db_connected: bool,
    pub llm_configured: bool,
    pub has_allowed_paths: bool,
    pub bot_configured: bool,
    pub gateway_connected: bool,
}

#[command]
pub async fn check_gateway() -> Result<bool, String> {
    match get_global_gateway() {
        Some(gw) => Ok(gw.is_connected().await),
        None => Ok(false),
    }
}

#[tauri::command]
pub async fn run_health_check(state: State<'_, AppState>) -> Result<HealthCheckResult, String> {
    let db_connected = sqlx::query("SELECT 1")
        .execute(&state.db)
        .await
        .is_ok();

    let llm_configured = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM connectors WHERE model != 'Sin modelo' AND endpoint != 'Sin endpoint'",
    )
    .fetch_one(&state.db)
    .await
    .map(|(count,)| count > 0)
    .unwrap_or(false);

    let has_allowed_paths = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM app_settings WHERE key = 'filesystem_config'",
    )
    .fetch_one(&state.db)
    .await
    .map(|(count,)| count > 0)
    .unwrap_or(false);

    let bot_configured = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM app_settings WHERE key = 'telegram_config'",
    )
    .fetch_one(&state.db)
    .await
    .map(|(count,)| count > 0)
    .unwrap_or(false);

    let gateway_connected = match get_global_gateway() {
        Some(gw) => gw.is_connected().await,
        None => false,
    };

    Ok(HealthCheckResult {
        db_connected,
        llm_configured,
        has_allowed_paths,
        bot_configured,
        gateway_connected,
    })
}
