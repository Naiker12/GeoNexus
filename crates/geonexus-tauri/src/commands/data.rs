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

/// Clears all demo data from the database.
#[tauri::command]
pub async fn clear_demo_data(
    state: State<'_, AppState>,
) -> Result<u64, String> {
    let pool = &state.db;

    // Delete related data first (before assets are removed)
    let _ = sqlx::query(
        "DELETE FROM document_chunks WHERE asset_id IN (SELECT id FROM data_assets WHERE source = 'demo' OR connector_id = 'connector-demo')"
    )
    .execute(pool)
    .await;

    let _ = sqlx::query(
        "DELETE FROM graph_nodes WHERE project_id IN (SELECT id FROM data_assets WHERE source = 'demo' OR connector_id = 'connector-demo')"
    )
    .execute(pool)
    .await;

    let _ = sqlx::query(
        "DELETE FROM graph_edges WHERE project_id IN (SELECT id FROM data_assets WHERE source = 'demo' OR connector_id = 'connector-demo')"
    )
    .execute(pool)
    .await;

    let assets_deleted = sqlx::query("DELETE FROM data_assets WHERE source = 'demo' OR connector_id = 'connector-demo'")
        .execute(pool)
        .await
        .map_err(|e| format!("Error clearing demo assets: {e}"))?
        .rows_affected();

    let connectors_deleted = sqlx::query("DELETE FROM connector_configs WHERE kind = 'demo' OR id = 'connector-demo'")
        .execute(pool)
        .await
        .map_err(|e| format!("Error clearing demo connectors: {e}"))?
        .rows_affected();

    tracing::info!(assets_deleted, connectors_deleted, "Demo data cleared");
    Ok(assets_deleted + connectors_deleted)
}
