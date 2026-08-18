use std::time::Instant;
use tauri::State;
use serde_json::{json, Value};
use geonexus_core::{AssetKind, AssetStatus, CacheState, DataAsset};
use geonexus_core::connector::{ConnectorConfig, ConnectorFile, ConnectorProvider};
use geonexus_core::connector::{calcular_diff, listar_archivos_locales};
use geonexus_db::connector_repo;
use crate::AppState;
use crate::commands::containers_mcp::{
    ContainerToolArgs, ensure_local_provider, validate_file_extension, unix_now, CONTAINERS_MCP_ID,
};

pub async fn container_list(
    state: &State<'_, AppState>,
    args: &ContainerToolArgs,
    provider: &str,
) -> Result<Value, String> {
    ensure_local_provider(provider)?;
    let cfg = resolve_connector(state, args).await?;
    let files = connector_repo::list_connector_files(&state.db, &cfg.id)
        .await
        .map_err(|e| format!("Error listando archivos del conector: {e}"))?;
    let path = args.path.as_deref().unwrap_or("/");
    let filtered = filter_files_by_path(files, path);

    Ok(json!({
        "status": "success",
        "provider": provider,
        "connector_id": cfg.id,
        "path": path,
        "count": filtered.len(),
        "files": filtered
    }))
}

pub async fn container_search(
    state: &State<'_, AppState>,
    args: &ContainerToolArgs,
    provider: &str,
) -> Result<Value, String> {
    ensure_local_provider(provider)?;
    let query = args
        .query
        .as_deref()
        .ok_or("query requerido para container_search")?
        .trim()
        .to_lowercase();

    if query.is_empty() {
        return Err("query requerido para container_search".into());
    }

    let cfg = resolve_connector(state, args).await?;
    let files = connector_repo::list_connector_files(&state.db, &cfg.id)
        .await
        .map_err(|e| format!("Error buscando archivos del conector: {e}"))?;
    let matches: Vec<ConnectorFile> = files
        .into_iter()
        .filter(|file| {
            file.name.to_lowercase().contains(&query)
                || file.path.to_lowercase().contains(&query)
        })
        .collect();

    Ok(json!({
        "status": "success",
        "provider": provider,
        "connector_id": cfg.id,
        "query": query,
        "results": matches.len(),
        "files": matches
    }))
}

pub async fn container_get(
    state: &State<'_, AppState>,
    args: &ContainerToolArgs,
    provider: &str,
    trace_id: &str,
) -> Result<Value, String> {
    ensure_local_provider(provider)?;
    let file_id = args
        .file_id
        .as_deref()
        .ok_or("file_id requerido para container_get")?;
    let cfg = resolve_connector(state, args).await?;
    let files = connector_repo::list_connector_files(&state.db, &cfg.id)
        .await
        .map_err(|e| format!("Error leyendo archivos del conector: {e}"))?;
    let file = files
        .into_iter()
        .find(|f| f.id == file_id)
        .ok_or_else(|| format!("Archivo no encontrado: {file_id}"))?;

    validate_file_extension(&file.name)?;
    let local_path = file
        .local_path
        .clone()
        .ok_or("El archivo no tiene ruta local cacheable")?;

    let root = cfg
        .root_path
        .as_deref()
        .ok_or("El conector local no tiene root_path")?;
    geonexus_core::allowlist::ruta_segura(root, &file.path)
        .map_err(|e| e.to_string())?;

    connector_repo::update_file_sync_status(
        &state.db,
        &file.id,
        geonexus_core::connector::FileSyncStatus::Synced,
    )
    .await
    .map_err(|e| format!("Error actualizando estado de cache: {e}"))?;

    let now = unix_now();
    let asset = DataAsset {
        id: file.id.clone(),
        project_id: cfg.project_id.clone(),
        workspace_id: cfg.workspace_id.clone(),
        name: file.name.clone(),
        kind: map_extension_to_kind(&file.name),
        source: provider.to_string(),
        location: local_path.clone(),
        agent_id: Some(CONTAINERS_MCP_ID.to_string()),
        connector_id: Some(cfg.id.clone()),
        status: AssetStatus::Pending,
        size_bytes: file.size_bytes,
        chunks: 0,
        embeddings: 0,
        graph_nodes: 0,
        cache_state: CacheState::Cached,
        trace_id: Some(trace_id.to_string()),
        created_at: now,
        updated_at: now,
    };
    state.repo.upsert_data_asset(&asset).await?;

    Ok(json!({
        "status": "downloaded",
        "provider": provider,
        "connector_id": cfg.id,
        "file_id": file.id,
        "asset_id": asset.id,
        "local_cache_path": local_path,
        "ready_to_load": matches!(asset.kind, AssetKind::Layer | AssetKind::Shapefile | AssetKind::Raster | AssetKind::Csv)
    }))
}

pub async fn container_sync(
    state: &State<'_, AppState>,
    args: &ContainerToolArgs,
    provider: &str,
) -> Result<Value, String> {
    ensure_local_provider(provider)?;
    if !args.confirmed.unwrap_or(false) {
        return Ok(json!({
            "status": "requires_confirmation",
            "operation": "sync",
            "provider": provider,
            "remote_path": args.remote_path.as_deref().unwrap_or("/"),
            "message": "Esta operacion sincronizara metadata del conector local. Confirma con confirmed=true."
        }));
    }

    let started = Instant::now();
    let cfg = resolve_connector(state, args).await?;
    let root_path = args
        .local_dir
        .as_deref()
        .or(cfg.root_path.as_deref())
        .ok_or("local_dir o root_path requerido para container_sync")?;
    let max_bytes = cfg.max_file_mb.saturating_mul(1024 * 1024);
    let discovered = listar_archivos_locales(&cfg.id, root_path, max_bytes, true)?;
    let existing = connector_repo::list_connector_files(&state.db, &cfg.id)
        .await
        .map_err(|e| format!("Error leyendo archivos existentes: {e}"))?;
    let (new_files, updated_files) = calcular_diff(&discovered, &existing);

    let mut errors = Vec::new();
    for file in new_files.iter().chain(updated_files.iter()) {
        if let Err(err) = connector_repo::upsert_connector_file(&state.db, file).await {
            errors.push(format!("{}: {err}", file.name));
        }
    }

    Ok(json!({
        "status": if errors.is_empty() { "completed" } else { "error" },
        "provider": provider,
        "connector_id": cfg.id,
        "remote_path": args.remote_path.as_deref().unwrap_or("/"),
        "added": new_files.len(),
        "updated": updated_files.len(),
        "deleted": 0,
        "conflicts": [],
        "errors": errors,
        "duration_ms": started.elapsed().as_millis() as u64
    }))
}

pub async fn container_upload(args: &ContainerToolArgs, provider: &str) -> Result<Value, String> {
    let local_path = args
        .local_path
        .as_deref()
        .ok_or("local_path requerido para container_upload")?;
    validate_file_extension(local_path)?;

    if !args.confirmed.unwrap_or(false) {
        return Ok(json!({
            "status": "requires_confirmation",
            "operation": "upload",
            "provider": provider,
            "destination": args.path.as_deref().unwrap_or("/"),
            "message": "container_upload siempre requiere confirmacion explicita. Reintenta con confirmed=true si deseas subir el archivo."
        }));
    }

    Err("container_upload confirmed queda reservado para Fase 5/OAuth; no se subio ningun archivo".into())
}

async fn resolve_connector(
    state: &State<'_, AppState>,
    args: &ContainerToolArgs,
) -> Result<ConnectorConfig, String> {
    let project_id = args.project_id.as_deref().unwrap_or("");
    let configs = connector_repo::list_connector_configs(&state.db, project_id)
        .await
        .map_err(|e| format!("Error leyendo conectores: {e}"))?;

    configs
        .into_iter()
        .find(|cfg| {
            cfg.provider == ConnectorProvider::Local
                && args
                    .connector_id
                    .as_deref()
                    .map(|id| cfg.id == id)
                    .unwrap_or(true)
        })
        .ok_or("No hay conector local activo para containers-mcp".into())
}

fn filter_files_by_path(files: Vec<ConnectorFile>, path: &str) -> Vec<ConnectorFile> {
    let normalized = path.trim().trim_matches('\\').trim_matches('/');
    if normalized.is_empty() {
        return files;
    }

    files
        .into_iter()
        .filter(|file| {
            file.path
                .trim_matches('\\')
                .trim_matches('/')
                .starts_with(normalized)
        })
        .collect()
}

fn map_extension_to_kind(name: &str) -> AssetKind {
    let ext = std::path::Path::new(name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "pdf" => AssetKind::Document,
        "docx" | "doc" => AssetKind::Word,
        "xlsx" | "xls" | "xlsm" => AssetKind::Excel,
        "geojson" | "json" | "kml" | "kmz" | "gpx" | "gpkg" => AssetKind::Layer,
        "shp" | "zip" => AssetKind::Shapefile,
        "csv" => AssetKind::Csv,
        "tif" | "tiff" | "geotiff" | "img" | "ecw" => AssetKind::Raster,
        _ => AssetKind::Other,
    }
}
