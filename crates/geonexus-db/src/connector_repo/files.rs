use sqlx::SqlitePool;
use geonexus_core::connector::{ConnectorFile, FileSyncStatus};
use crate::connector_repo::row_to_file;

pub async fn upsert_connector_file(
    pool: &SqlitePool,
    file: &ConnectorFile,
) -> Result<(), sqlx::Error> {
    let status = serde_json::to_string(&file.sync_status).unwrap_or_default();

    sqlx::query(
        "INSERT INTO connector_files
            (id, connector_id, name, path, local_path, size_bytes, mime_type,
             modified_remote, modified_local, sync_status, etag, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET
            local_path      = excluded.local_path,
            size_bytes      = excluded.size_bytes,
            modified_remote = excluded.modified_remote,
            modified_local  = excluded.modified_local,
            sync_status     = excluded.sync_status,
            etag            = excluded.etag"
    )
    .bind(&file.id)
    .bind(&file.connector_id)
    .bind(&file.name)
    .bind(&file.path)
    .bind(&file.local_path)
    .bind(file.size_bytes)
    .bind(&file.mime_type)
    .bind(file.modified_remote)
    .bind(file.modified_local)
    .bind(status.trim_matches('"'))
    .bind(&file.etag)
    .bind(file.created_at)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn list_connector_files(
    pool: &SqlitePool,
    connector_id: &str,
) -> Result<Vec<ConnectorFile>, sqlx::Error> {
    let rows = sqlx::query("SELECT * FROM connector_files WHERE connector_id = ? ORDER BY name ASC")
        .bind(connector_id)
        .fetch_all(pool)
        .await?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(f) = row_to_file(&r) {
            list.push(f);
        }
    }
    Ok(list)
}

pub async fn update_file_sync_status(
    pool: &SqlitePool,
    file_id: &str,
    status: FileSyncStatus,
) -> Result<(), sqlx::Error> {
    let s = serde_json::to_string(&status).unwrap_or_default();
    sqlx::query("UPDATE connector_files SET sync_status = ? WHERE id = ?")
        .bind(s.trim_matches('"'))
        .bind(file_id)
        .execute(pool)
        .await?;
    Ok(())
}
