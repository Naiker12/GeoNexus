use super::configs::{insert_connector_config, list_connector_configs};
use super::files::{upsert_connector_file, list_connector_files, update_file_sync_status};
use geonexus_core::connector::{ConnectorConfig, ConnectorFile, ConnectorProvider, FileSyncStatus};
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
        workspace_id: Some("w1".into()),
        provider: ConnectorProvider::Local,
        display_name: "Carpeta POT".into(),
        root_path: Some("/tmp/gis".into()),
        qgis_project_path: None,
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
