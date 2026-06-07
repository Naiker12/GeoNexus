use sqlx::{SqlitePool, Row};
use geonexus_core::connector::{ConnectorConfig, ConnectorFile, ConnectorProvider, FileSyncStatus};

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
            (id, project_id, provider, display_name, root_path, base_url,
             client_id, tenant_id, sync_folders, file_filter, max_file_mb,
             is_active, last_synced, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    )
    .bind(&cfg.id)
    .bind(&cfg.project_id)
    .bind(provider.trim_matches('"'))
    .bind(&cfg.display_name)
    .bind(&cfg.root_path)
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

fn row_to_config(row: &sqlx::sqlite::SqliteRow) -> Result<ConnectorConfig, String> {
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
        provider,
        display_name: row.get("display_name"),
        root_path: row.get("root_path"),
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

fn row_to_file(row: &sqlx::sqlite::SqliteRow) -> Result<ConnectorFile, String> {
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

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn db_en_memoria() -> sqlx::SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    fn config_local(id: &str, project_id: &str) -> ConnectorConfig {
        let now = 1_700_000_000i64;
        ConnectorConfig {
            id: id.into(), project_id: project_id.into(),
            provider: ConnectorProvider::Local,
            display_name: "Carpeta POT".into(),
            root_path: Some("/tmp/gis".into()),
            base_url: None, client_id: None, tenant_id: None,
            sync_folders: vec![], file_filter: vec![],
            max_file_mb: 500, is_active: true,
            last_synced: None, created_at: now, updated_at: now,
        }
    }

    fn archivo_test(id: &str, connector_id: &str, path: &str) -> ConnectorFile {
        ConnectorFile {
            id: id.into(), connector_id: connector_id.into(),
            name: "test.geojson".into(), path: path.into(),
            local_path: Some("/tmp/gis/test.geojson".into()),
            size_bytes: Some(1024), mime_type: None,
            modified_remote: Some(1_700_000_000),
            modified_local: Some(1_700_000_000),
            sync_status: FileSyncStatus::Pending,
            etag: None, created_at: 1_700_000_000,
        }
    }

    #[tokio::test]
    async fn insert_y_list_connector_config() {
        let pool = db_en_memoria().await;
        let cfg = config_local("c1", "p1");
        insert_connector_config(&pool, &cfg).await.unwrap();

        let lista = list_connector_configs(&pool, "p1").await.unwrap();
        assert_eq!(lista.len(), 1);
        assert_eq!(lista[0].id, "c1");
    }

    #[tokio::test]
    async fn list_connector_config_no_devuelve_inactivos() {
        let pool = db_en_memoria().await;
        let mut cfg = config_local("c1", "p1");
        cfg.is_active = false;
        insert_connector_config(&pool, &cfg).await.unwrap();

        let lista = list_connector_configs(&pool, "p1").await.unwrap();
        assert!(lista.is_empty());
    }

    #[tokio::test]
    async fn upsert_archivo_nuevo() {
        let pool = db_en_memoria().await;
        let cfg = config_local("c1", "p1");
        insert_connector_config(&pool, &cfg).await.unwrap();

        let archivo = archivo_test("f1", "c1", "predios.geojson");
        upsert_connector_file(&pool, &archivo).await.unwrap();

        let lista = list_connector_files(&pool, "c1").await.unwrap();
        assert_eq!(lista.len(), 1);
        assert_eq!(lista[0].sync_status, FileSyncStatus::Pending);
    }

    #[tokio::test]
    async fn upsert_actualiza_archivo_existente() {
        let pool = db_en_memoria().await;
        let cfg = config_local("c1", "p1");
        insert_connector_config(&pool, &cfg).await.unwrap();

        let archivo = archivo_test("f1", "c1", "predios.geojson");
        upsert_connector_file(&pool, &archivo).await.unwrap();

        let actualizado = ConnectorFile {
            sync_status: FileSyncStatus::Synced,
            modified_remote: Some(1_700_999_999),
            ..archivo
        };
        upsert_connector_file(&pool, &actualizado).await.unwrap();

        let lista = list_connector_files(&pool, "c1").await.unwrap();
        assert_eq!(lista.len(), 1);
        assert_eq!(lista[0].sync_status, FileSyncStatus::Synced);
    }

    #[tokio::test]
    async fn update_file_sync_status_cambia_solo_el_status() {
        let pool = db_en_memoria().await;
        let cfg = config_local("c1", "p1");
        insert_connector_config(&pool, &cfg).await.unwrap();

        let archivo = archivo_test("f1", "c1", "barrios.shp");
        upsert_connector_file(&pool, &archivo).await.unwrap();
        update_file_sync_status(&pool, "f1", FileSyncStatus::Conflict).await.unwrap();

        let lista = list_connector_files(&pool, "c1").await.unwrap();
        assert_eq!(lista[0].sync_status, FileSyncStatus::Conflict);
        assert_eq!(lista[0].name, "test.geojson"); // nombre no cambió
    }

    #[tokio::test]
    async fn list_connector_files_vacio_cuando_no_hay_archivos() {
        let pool = db_en_memoria().await;
        let cfg = config_local("c1", "p1");
        insert_connector_config(&pool, &cfg).await.unwrap();

        let lista = list_connector_files(&pool, "c1").await.unwrap();
        assert!(lista.is_empty());
    }
}
