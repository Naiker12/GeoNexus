use std::time::{Instant, SystemTime, UNIX_EPOCH};
use geonexus_core::allowlist::extension_permitida;
use geonexus_mcp::containers::{container_tools_schema, is_container_tool, CONTAINERS_MCP_ID};
use serde::Deserialize;
use serde_json::{json, Value};
use tauri::State;
use uuid::Uuid;
use crate::AppState;

pub mod handlers;

#[derive(Debug, Deserialize)]
pub struct ContainerToolArgs {
    pub provider: String,
    pub project_id: Option<String>,
    pub connector_id: Option<String>,
    pub path: Option<String>,
    pub file_id: Option<String>,
    pub query: Option<String>,
    pub remote_path: Option<String>,
    pub local_dir: Option<String>,
    pub local_path: Option<String>,
    pub confirmed: Option<bool>,
    pub trace_id: Option<String>,
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
        "container_list" => handlers::container_list(&state, &parsed, &provider).await,
        "container_get" => handlers::container_get(&state, &parsed, &provider, &trace_id).await,
        "container_search" => handlers::container_search(&state, &parsed, &provider).await,
        "container_sync" => handlers::container_sync(&state, &parsed, &provider).await,
        "container_upload" => handlers::container_upload(&parsed, &provider).await,
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

pub(crate) fn ensure_local_provider(provider: &str) -> Result<(), String> {
    if provider == "local" {
        Ok(())
    } else {
        Err(format!(
            "Proveedor '{provider}' preparado para Fase 5; Fase 4 ejecuta proveedor local"
        ))
    }
}

pub(crate) fn normalize_provider(provider: &str) -> Result<String, String> {
    let normalized = provider.trim().to_lowercase();
    match normalized.as_str() {
        "local" | "onedrive" | "google_drive" | "sharepoint" | "dropbox" | "s3" => {
            Ok(normalized)
        }
        _ => Err(format!("Proveedor no soportado: {provider}")),
    }
}

pub(crate) fn validate_file_extension(path: &str) -> Result<(), String> {
    if extension_permitida(path) {
        Ok(())
    } else {
        Err(format!("Extension fuera de allowlist: {path}"))
    }
}

pub(crate) fn sanitize_args(args: &Value) -> String {
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

pub(crate) async fn log_container_call(
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

pub(crate) fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
