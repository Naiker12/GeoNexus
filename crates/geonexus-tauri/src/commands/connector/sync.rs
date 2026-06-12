use tauri::State;
use uuid::Uuid;
use crate::AppState;
use geonexus_core::{DataAsset, AssetStatus, CacheState, GraphNode, GraphUpdatePayload};
use geonexus_core::connector::{ConnectorConfig, ConnectorFile, ConnectorProvider, SyncReport};
use geonexus_core::connector::{listar_archivos_locales, calcular_diff};
use geonexus_db::connector_repo;
use crate::commands::connector::{unix_now, map_extension_to_kind};
use crate::commands::graph_events::emit_graph_update;

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

    // Obtener la configuración del conector para conocer project_id y workspace_id
    let configs = connector_repo::list_connector_configs(&state.db, "")
        .await
        .map_err(|_| "Error al leer conectores".to_string())?;

    let cfg = configs
        .into_iter()
        .find(|c| c.id == connector_id)
        .ok_or_else(|| format!("Conector no encontrado: {connector_id}"))?;

    let trace_id = Uuid::new_v4().to_string();
    let now = unix_now();
    let location = file.local_path.clone().unwrap_or_else(|| file.path.clone());

    // Mapear proveedor del conector a string
    let source_str = match cfg.provider {
        ConnectorProvider::Local => "local",
        ConnectorProvider::OneDrive => "onedrive",
        ConnectorProvider::SharePoint => "sharepoint",
        ConnectorProvider::GoogleDrive => "googledrive",
        ConnectorProvider::Dropbox => "dropbox",
        ConnectorProvider::S3 => "s3",
    };

    // Insertar/actualizar en la tabla de activos (data_assets / assets) en estado Pending
    let asset = DataAsset {
        id: file.id.clone(),
        project_id: cfg.project_id.clone(),
        workspace_id: cfg.workspace_id.clone(),
        name: file.name.clone(),
        kind: map_extension_to_kind(&file.name),
        source: source_str.to_string(),
        location,
        agent_id: None,
        connector_id: Some(connector_id.clone()),
        status: AssetStatus::Pending,
        size_bytes: file.size_bytes,
        chunks: 0,
        embeddings: 0,
        graph_nodes: 0,
        cache_state: CacheState::Cached,
        trace_id: Some(trace_id.clone()),
        created_at: now,
        updated_at: now,
    };

    state.repo.upsert_data_asset(&asset).await?;

    // Registrar evento en sync_events
    insert_sync_event(
        &state.db,
        &file.connector_id,
        Some(&asset.id),
        None,
        "downloaded",
        Some(format!("Archivo cacheado y registrado como activo: {}", file.name)),
        Some(&trace_id),
    )
    .await;

    Ok(ConnectorFile {
        sync_status: geonexus_core::connector::FileSyncStatus::Synced,
        ..file
    })
}

/// Sube un archivo al sistema: lo guarda en disco, crea el ConnectorFile
/// y el DataAsset, y retorna el ID del activo.
#[tauri::command]
pub async fn upload_asset_file(
    project_id: String,
    workspace_id: Option<String>,
    connector_id: String,
    file_name: String,
    bytes: Vec<u8>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    if project_id.trim().is_empty() || connector_id.trim().is_empty() || file_name.trim().is_empty() {
        return Err("project_id, connector_id y file_name requeridos".into());
    }

    // Asegurar que el conector existe — si no, crear uno automático
    let configs = connector_repo::list_connector_configs(&state.db, &project_id)
        .await
        .map_err(|_| "Error al leer conectores".to_string())?;
    if !configs.iter().any(|c| c.id == connector_id) {
        let now = unix_now();
        let cfg = ConnectorConfig {
            id: connector_id.clone(),
            project_id: project_id.clone(),
            workspace_id: workspace_id.clone(),
            provider: ConnectorProvider::Local,
            display_name: "Subida directa".into(),
            root_path: None,
            qgis_project_path: None,
            base_url: None,
            client_id: None,
            tenant_id: None,
            sync_folders: vec![],
            file_filter: vec![],
            max_file_mb: 500,
            is_active: true,
            last_synced: None,
            created_at: now,
            updated_at: now,
        };
        connector_repo::insert_connector_config(&state.db, &cfg)
            .await
            .map_err(|e| format!("Error al crear conector: {e}"))?;
    }

    let upload_dir = std::path::Path::new(&state.db_path)
        .parent()
        .unwrap_or(std::path::Path::new("."))
        .join("uploads")
        .join(&connector_id);

    std::fs::create_dir_all(&upload_dir).map_err(|e| format!("Error al crear directorio: {e}"))?;

    let file_path = upload_dir.join(&file_name);
    std::fs::write(&file_path, &bytes).map_err(|e| format!("Error al escribir archivo: {e}"))?;
    let file_path_str = file_path.to_string_lossy().to_string();

    let asset_id = Uuid::new_v4().to_string();
    let now = unix_now();
    let trace_id = Uuid::new_v4().to_string();

    // Crear ConnectorFile
    let conn_file = ConnectorFile {
        id: asset_id.clone(),
        connector_id: connector_id.clone(),
        name: file_name.clone(),
        path: file_path_str.clone(),
        local_path: Some(file_path_str.clone()),
        size_bytes: Some(bytes.len() as i64),
        mime_type: None,
        modified_remote: None,
        modified_local: Some(now),
        sync_status: geonexus_core::connector::FileSyncStatus::Synced,
        etag: None,
        created_at: now,
    };
    connector_repo::upsert_connector_file(&state.db, &conn_file)
        .await
        .map_err(|e| format!("Error al guardar connector_file: {e}"))?;

    let asset_kind = map_extension_to_kind(&file_name);

    // Crear DataAsset (Pending, sin indexar aún)
    let asset = DataAsset {
        id: asset_id.clone(),
        project_id,
        workspace_id,
        name: file_name,
        kind: asset_kind,
        source: "local".into(),
        location: file_path_str,
        agent_id: None,
        connector_id: Some(connector_id),
        status: AssetStatus::Pending,
        size_bytes: Some(bytes.len() as i64),
        chunks: 0,
        embeddings: 0,
        graph_nodes: 0,
        cache_state: CacheState::Cached,
        trace_id: Some(trace_id),
        created_at: now,
        updated_at: now,
    };
    state.repo.upsert_data_asset(&asset).await?;

    Ok(asset_id)
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

    let trace_id = Uuid::new_v4().to_string();
    insert_sync_event(
        &state.db,
        &connector_id,
        None,
        None,
        "discovered",
        Some(format!("{} archivos descubiertos", descubiertos_count)),
        Some(&trace_id),
    )
    .await;

    // Emitir evento graph:updated para sincronización
    if let Some(ref handle) = state.app_handle {
        let now_ts = unix_now();
        let conn_node = GraphNode {
            id: format!("sync-{}", connector_id),
            project_id: cfg.project_id.clone(),
            workspace_id: cfg.workspace_id.clone(),
            name: format!("Sincronización: {}", cfg.display_name),
            kind: "connector".into(),
            description: format!("{} archivos sincronizados desde {}", descubiertos_count, cfg.display_name),
            evidence: format!("Connector ID: {}", connector_id),
            x: 50.0,
            y: 50.0,
            weight: 1,
            created_at: now_ts,
            source_event: "sync".into(),
            event_id: trace_id.clone(),
            icon: "".into(),
            is_ephemeral: false,
            source_asset_id: None,
            source_chat_id: None,
            origin_kind: "connector".into(),
            pinned: false,
            deleted_at: None,
        };
        let payload = GraphUpdatePayload {
            source_event: "sync".into(),
            event_id: trace_id,
            nodes: vec![conn_node],
            edges: vec![],
            timestamp: now_ts,
        };
        emit_graph_update(handle, payload);
    }

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
    agent_id: Option<&str>,
    event_type: &str,
    detail: Option<String>,
    trace_id: Option<&str>,
) {
    let id = Uuid::new_v4().to_string();
    let now = unix_now();
    let trace_str = trace_id.unwrap_or("");
    let _ = sqlx::query(
        "INSERT INTO sync_events (id, project_id, workspace_id, connector_id, asset_id, agent_id, event_type, detail, trace_id, created_at)
         SELECT ?, project_id, workspace_id, ?, ?, ?, ?, ?, ?, ?
         FROM connector_configs WHERE id = ?"
    )
    .bind(id)
    .bind(connector_id)
    .bind(asset_id)
    .bind(agent_id)
    .bind(event_type)
    .bind(detail)
    .bind(trace_str)
    .bind(now)
    .bind(connector_id)
    .execute(pool)
    .await;
}
