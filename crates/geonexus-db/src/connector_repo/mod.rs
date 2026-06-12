use sqlx::Row;
use geonexus_core::connector::{ConnectorConfig, ConnectorFile, ConnectorProvider, FileSyncStatus};

pub mod configs;
pub mod files;

pub use configs::{insert_connector_config, list_connector_configs};
pub use files::{upsert_connector_file, list_connector_files, update_file_sync_status};

#[cfg(test)]
mod tests;

pub(crate) fn row_to_config(row: &sqlx::sqlite::SqliteRow) -> Result<ConnectorConfig, String> {
    let provider_str: String = row.get("provider");
    let sync_folders_str: String = row.get("sync_folders");
    let file_filter_str: String = row.get("file_filter");
    let is_active_val: i64 = row.get("is_active");

    let provider = serde_json::from_str(&format!("\"{provider_str}\"")).unwrap_or(ConnectorProvider::Local);
    let sync_folders = serde_json::from_str(&sync_folders_str).unwrap_or_default();
    let file_filter = serde_json::from_str(&file_filter_str).unwrap_or_default();

    Ok(ConnectorConfig {
        id: row.get("id"),
        project_id: row.get("project_id"),
        workspace_id: row.get("workspace_id"),
        provider,
        display_name: row.get("display_name"),
        root_path: row.get("root_path"),
        qgis_project_path: row.get("qgis_project_path"),
        base_url: row.get("base_url"),
        client_id: row.get("client_id"),
        tenant_id: row.get("tenant_id"),
        sync_folders,
        file_filter,
        max_file_mb: row.get("max_file_mb"),
        is_active: is_active_val != 0,
        last_synced: row.get("last_synced"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub(crate) fn row_to_file(row: &sqlx::sqlite::SqliteRow) -> Result<ConnectorFile, String> {
    let sync_status_str: String = row.get("sync_status");
    let sync_status = serde_json::from_str(&format!("\"{sync_status_str}\"")).unwrap_or(FileSyncStatus::Pending);

    Ok(ConnectorFile {
        id: row.get("id"),
        connector_id: row.get("connector_id"),
        name: row.get("name"),
        path: row.get("path"),
        local_path: row.get("local_path"),
        size_bytes: row.get("size_bytes"),
        mime_type: row.get("mime_type"),
        modified_remote: row.get("modified_remote"),
        modified_local: row.get("modified_local"),
        sync_status,
        etag: row.get("etag"),
        created_at: row.get("created_at"),
    })
}
