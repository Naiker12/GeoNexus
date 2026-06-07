use tauri::State;
use uuid::Uuid;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::AppState;
use geonexus_core::connector::{
    ConnectorConfig, ConnectorFile, ConnectorProvider,
    RegisterLocalConnectorInput, SyncReport,
};
use geonexus_core::local_connector::{listar_archivos_locales, calcular_diff};
use geonexus_db::connector_repo;

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Registra una carpeta local como conector del proyecto.
/// Valida que la ruta exista antes de persistir.
#[tauri::command]
pub async fn register_local_connector(
    input: RegisterLocalConnectorInput,
    state: State<'_, AppState>,
) -> Result<ConnectorConfig, String> {
    input.validate()?;

    let now = unix_now();
    let max_mb = input.max_file_mb.unwrap_or(500);

    let cfg = ConnectorConfig {
        id: Uuid::new_v4().to_string(),
        project_id: input.project_id,
        provider: ConnectorProvider::Local,
        display_name: input.display_name,
        root_path: Some(input.root_path),
        base_url: None,
        client_id: None,
        tenant_id: None,
        sync_folders: vec![],
        file_filter: input.file_filter,
        max_file_mb: max_mb,
        is_active: true,
        last_synced: None,
        created_at: now,
        updated_at: now,
    };

    connector_repo::insert_connector_config(&state.db, &cfg)
        .await
        .map_err(|e| {
            tracing::error!(
                project_id = %cfg.project_id,
                error = %e,
                "register_local_connector: insert falló"
            );
            "Error al registrar conector".to_string()
        })?;

    Ok(cfg)
}

/// Lista los archivos de un conector local según su root_path y filtros.
#[tauri::command]
pub async fn list_connector_files(
    connector_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ConnectorFile>, String> {
    if connector_id.trim().is_empty() {
        return Err("connector_id requerido".into());
    }

    connector_repo::list_connector_files(&state.db, &connector_id)
        .await
        .map_err(|e| {
            tracing::error!(connector_id = %connector_id, error = %e, "list_connector_files falló");
            "Error al listar archivos del conector".to_string()
        })
}

/// Descarga (copia al cache local) un archivo del conector.
/// Para el conector local, el archivo ya está local — solo actualiza el status.
#[tauri::command]
pub async fn cache_connector_file(
    connector_id: String,
    file_id: String,
    state: State<'_, AppState>,
) -> Result<ConnectorFile, String> {
    if connector_id.trim().is_empty() || file_id.trim().is_empty() {
        return Err("connector_id y file_id requeridos".into());
    }

    let files = connector_repo::list_connector_files(&state.db, &connector_id)
        .await
        .map_err(|_| "Error de base de datos".to_string())?;

    let file = files
        .into_iter()
        .find(|f| f.id == file_id)
        .ok_or_else(|| format!("Archivo no encontrado: {file_id}"))?;

    // Para local: verificar que la ruta sigue existiendo
    if let Some(local_path) = &file.local_path {
        if !std::path::Path::new(local_path).exists() {
            return Err(format!("Archivo no encontrado en disco: {local_path}"));
        }
    }

    connector_repo::update_file_sync_status(
        &state.db,
        &file_id,
        geonexus_core::connector::FileSyncStatus::Synced,
    )
    .await
    .map_err(|_| "Error al actualizar status".to_string())?;

    // Registrar evento en sync_events
    insert_sync_event(
        &state.db,
        &file.connector_id,
        None,
        "downloaded",
        Some(format!("Archivo cacheado: {}", file.name)),
    )
    .await;

    Ok(ConnectorFile {
        sync_status: geonexus_core::connector::FileSyncStatus::Synced,
        ..file
    })
}

/// Sincroniza el conector local: descubre cambios, actualiza connector_files
/// y crea eventos en sync_events.
#[tauri::command]
pub async fn sync_local_connector(
    connector_id: String,
    state: State<'_, AppState>,
) -> Result<SyncReport, String> {
    if connector_id.trim().is_empty() {
        return Err("connector_id requerido".into());
    }

    let start = std::time::Instant::now();

    // Obtener config del conector (usamos "" para listar todos los conectores activos)
    let configs = connector_repo::list_connector_configs(&state.db, "")
        .await
        .map_err(|_| "Error al leer conector".to_string())?;

    let cfg = configs
        .into_iter()
        .find(|c| c.id == connector_id)
        .ok_or_else(|| format!("Conector no encontrado: {connector_id}"))?;

    let root_path = cfg
        .root_path
        .as_deref()
        .ok_or("El conector local no tiene root_path")?
        .to_string();

    let max_bytes = cfg.max_file_mb * 1024 * 1024;

    // Descubrir archivos en disco (búsqueda recursiva)
    let descubiertos = listar_archivos_locales(&connector_id, &root_path, max_bytes, true)
        .map_err(|e| format!("Error listando archivos: {e}"))?;

    // Comparar con lo que ya está en SQLite
    let existentes = connector_repo::list_connector_files(&state.db, &connector_id)
        .await
        .map_err(|_| "Error de base de datos".to_string())?;

    let (nuevos, actualizados) = calcular_diff(&descubiertos, &existentes);

    let mut errores = Vec::new();
    let descubiertos_count = nuevos.len() + actualizados.len();

    for archivo in nuevos.iter().chain(actualizados.iter()) {
        if let Err(e) = connector_repo::upsert_connector_file(&state.db, archivo).await {
            errores.push(format!("Error en {}: {e}", archivo.name));
        }
    }

    insert_sync_event(
        &state.db,
        &connector_id,
        None,
        "discovered",
        Some(format!("{} archivos descubiertos", descubiertos_count)),
    )
    .await;

    Ok(SyncReport {
        connector_id,
        discovered: descubiertos_count,
        downloaded: 0,
        skipped: descubiertos.len() - descubiertos_count,
        conflicts: 0,
        errors: errores,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

/// Helper interno — registra evento de sync sin propagar error al caller.
async fn insert_sync_event(
    pool: &sqlx::SqlitePool,
    connector_id: &str,
    asset_id: Option<&str>,
    event_type: &str,
    detail: Option<String>,
) {
    let id = Uuid::new_v4().to_string();
    let now = unix_now();
    let _ = sqlx::query(
        "INSERT INTO sync_events (id, project_id, connector_id, asset_id, event_type, detail, created_at)
         SELECT ?, project_id, ?, ?, ?, ?, ?
         FROM connector_configs WHERE id = ?"
    )
    .bind(id)
    .bind(connector_id)
    .bind(asset_id)
    .bind(event_type)
    .bind(detail)
    .bind(now)
    .bind(connector_id)
    .execute(pool)
    .await;
}
