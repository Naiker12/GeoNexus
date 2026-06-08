use std::time::{Instant, SystemTime, UNIX_EPOCH};

use geonexus_core::allowlist::extension_permitida;
use geonexus_core::connector::{ConnectorConfig, ConnectorFile, ConnectorProvider};
use geonexus_core::local_connector::{calcular_diff, listar_archivos_locales};
use geonexus_core::{AssetKind, AssetStatus, CacheState, DataAsset};
use geonexus_db::connector_repo;
use geonexus_mcp::containers::{
    container_tools_schema, is_container_tool, CONTAINERS_MCP_ID,
};
use serde::Deserialize;
use serde_json::{json, Value};
use tauri::State;
use uuid::Uuid;

use crate::AppState;

#[derive(Debug, Deserialize)]
struct ContainerToolArgs {
    provider: String,
    project_id: Option<String>,
    connector_id: Option<String>,
    path: Option<String>,
    file_id: Option<String>,
    query: Option<String>,
    remote_path: Option<String>,
    local_dir: Option<String>,
    local_path: Option<String>,
    confirmed: Option<bool>,
    trace_id: Option<String>,
}

#[tauri::command]
pub async fn init_containers_mcp() -> Result<Value, String> {
    Ok(json!({
        "id": CONTAINERS_MCP_ID,
        "status": "active",
        "provider_status": {
            "local": "available",
            "onedrive": "pending_oauth_phase5",
            "google_drive": "pending_oauth_phase5",
            "sharepoint": "pending_oauth_phase5",
            "dropbox": "pending_oauth_phase5",
            "s3": "pending_credentials"
        },
        "tools": container_tools_schema()
    }))
}

#[tauri::command]
pub async fn dispatch_container_tool(
    tool_name: String,
    args: Value,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    if !is_container_tool(&tool_name) {
        return Err(format!("Tool '{tool_name}' no reconocida en containers-mcp"));
    }

    let started = Instant::now();
    let parsed: ContainerToolArgs = serde_json::from_value(args.clone())
        .map_err(|e| format!("Argumentos invalidos para {tool_name}: {e}"))?;
    let provider = normalize_provider(&parsed.provider)?;
    let project_id_hint = parsed.project_id.clone();
    let trace_id = parsed.trace_id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());

    let result = match tool_name.as_str() {
        "container_list" => container_list(&state, &parsed, &provider).await,
        "container_get" => container_get(&state, &parsed, &provider, &trace_id).await,
        "container_search" => container_search(&state, &parsed, &provider).await,
        "container_sync" => container_sync(&state, &parsed, &provider).await,
        "container_upload" => container_upload(&parsed, &provider).await,
        _ => unreachable!(),
    };

    let status = match &result {
        Ok(value) => value
            .get("status")
            .and_then(Value::as_str)
            .unwrap_or("success")
            .to_string(),
        Err(err) if err.contains("confirmacion") || err.contains("requires_confirmation") => {
            "requires_confirmation".to_string()
        }
        Err(_) => "error".to_string(),
    };

    log_container_call(
        &state.db,
        &tool_name,
        &provider,
        sanitize_args(&args),
        &status,
        started.elapsed().as_millis() as i64,
        project_id_hint.as_deref(),
        &trace_id,
    )
    .await;

    result
}

async fn container_list(
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

async fn container_search(
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

async fn container_get(
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

async fn container_sync(
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

async fn container_upload(args: &ContainerToolArgs, provider: &str) -> Result<Value, String> {
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

    Err("container_upload confirmado queda reservado para Fase 5/OAuth; no se subio ningun archivo".into())
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

fn ensure_local_provider(provider: &str) -> Result<(), String> {
    if provider == "local" {
        Ok(())
    } else {
        Err(format!(
            "Proveedor '{provider}' preparado para Fase 5; Fase 4 ejecuta proveedor local"
        ))
    }
}

fn normalize_provider(provider: &str) -> Result<String, String> {
    let normalized = provider.trim().to_lowercase();
    match normalized.as_str() {
        "local" | "onedrive" | "google_drive" | "sharepoint" | "dropbox" | "s3" => {
            Ok(normalized)
        }
        _ => Err(format!("Proveedor no soportado: {provider}")),
    }
}

fn validate_file_extension(path: &str) -> Result<(), String> {
    if extension_permitida(path) {
        Ok(())
    } else {
        Err(format!("Extension fuera de allowlist: {path}"))
    }
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

fn sanitize_args(args: &Value) -> String {
    let mut sanitized = args.clone();
    if let Some(obj) = sanitized.as_object_mut() {
        if obj.contains_key("local_path") {
            obj.insert("local_path".into(), json!("[redacted]"));
        }
        if obj.contains_key("path") {
            obj.insert("path".into(), json!("[redacted]"));
        }
    }
    serde_json::to_string(&sanitized).unwrap_or_else(|_| "{}".into())
}

async fn log_container_call(
    pool: &sqlx::SqlitePool,
    tool_name: &str,
    provider: &str,
    args_json: String,
    result_status: &str,
    duration_ms: i64,
    project_id: Option<&str>,
    trace_id: &str,
) {
    let _ = sqlx::query(
        "INSERT INTO container_mcp_calls
            (id, tool_name, provider, args_json, result_status, duration_ms, project_id, trace_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(Uuid::new_v4().to_string())
    .bind(tool_name)
    .bind(provider)
    .bind(args_json)
    .bind(result_status)
    .bind(duration_ms)
    .bind(project_id)
    .bind(trace_id)
    .bind(unix_now())
    .execute(pool)
    .await;
}

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
