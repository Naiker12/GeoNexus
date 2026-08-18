use sqlx::SqlitePool;
use geonexus_core::connector::ConnectorConfig;
use crate::connector_repo::row_to_config;

pub async fn insert_connector_config(
    pool: &SqlitePool,
    cfg: &ConnectorConfig,
) -> Result<(), sqlx::Error> {
    let sync_folders = serde_json::to_string(&cfg.sync_folders).unwrap_or_default();
    let file_filter  = serde_json::to_string(&cfg.file_filter).unwrap_or_default();
    let provider     = serde_json::to_string(&cfg.provider).unwrap_or_default();
    let is_active    = if cfg.is_active { 1i64 } else { 0i64 };

    sqlx::query(
        "INSERT INTO connector_configs
            (id, project_id, workspace_id, provider, display_name, root_path,
             qgis_project_path, base_url, client_id, tenant_id, sync_folders,
             file_filter, max_file_mb, is_active, last_synced, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    )
    .bind(&cfg.id)
    .bind(&cfg.project_id)
    .bind(&cfg.workspace_id)
    .bind(provider.trim_matches('"'))
    .bind(&cfg.display_name)
    .bind(&cfg.root_path)
    .bind(&cfg.qgis_project_path)
    .bind(&cfg.base_url)
    .bind(&cfg.client_id)
    .bind(&cfg.tenant_id)
    .bind(&sync_folders)
    .bind(&file_filter)
    .bind(cfg.max_file_mb)
    .bind(is_active)
    .bind(cfg.last_synced)
    .bind(cfg.created_at)
    .bind(cfg.updated_at)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn list_connector_configs(
    pool: &SqlitePool,
    project_id: &str,
) -> Result<Vec<ConnectorConfig>, sqlx::Error> {
    let rows = if project_id.is_empty() {
        sqlx::query("SELECT * FROM connector_configs WHERE is_active = 1")
            .fetch_all(pool)
            .await?
    } else {
        sqlx::query("SELECT * FROM connector_configs WHERE project_id = ? AND is_active = 1")
            .bind(project_id)
            .fetch_all(pool)
            .await?
    };

    let mut list = Vec::new();
    for r in rows {
        if let Ok(cfg) = row_to_config(&r) {
            list.push(cfg);
        }
    }
    Ok(list)
}

pub async fn delete_connector_config(pool: &SqlitePool, connector_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM connector_configs WHERE id = ?")
        .bind(connector_id)
        .execute(pool)
        .await?;
    Ok(())
}
