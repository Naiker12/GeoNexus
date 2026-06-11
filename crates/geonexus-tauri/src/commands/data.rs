use tauri::State;
use crate::AppState;
use geonexus_core::{AssetValidation, DataAsset, DataStoreMetrics, SyncEvent};

#[tauri::command]
pub async fn list_data_assets(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<DataAsset>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    state.repo.list_data_assets(&project_id).await
}

#[tauri::command]
pub async fn get_data_asset(
    asset_id: String,
    state: State<'_, AppState>,
) -> Result<Option<DataAsset>, String> {
    if asset_id.trim().is_empty() {
        return Err("asset_id requerido".into());
    }
    state.repo.get_data_asset(&asset_id).await
}

#[tauri::command]
pub async fn get_data_store_metrics(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<DataStoreMetrics, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    state.repo.get_data_store_metrics(&project_id).await
}

#[tauri::command]
pub async fn get_sync_events(
    project_id: String,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<SyncEvent>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    let limit = limit.unwrap_or(50).clamp(1, 100);
    state.repo.get_sync_events(&project_id, limit).await
}

#[tauri::command]
pub async fn validate_data_asset(
    asset_id: String,
    state: State<'_, AppState>,
) -> Result<AssetValidation, String> {
    if asset_id.trim().is_empty() {
        return Err("asset_id requerido".into());
    }
    state.repo.validate_data_asset(&asset_id).await
}

#[tauri::command]
pub async fn seed_demo_data(
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.repo.seed_demo_data().await
}
