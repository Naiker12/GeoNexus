use tauri::State;
use crate::AppState;
use geonexus_mcp::types::*;
use geonexus_mcp::{registry, pinger};

#[tauri::command]
pub async fn list_mcp_servers(
    state: State<'_, AppState>,
) -> Result<Vec<McpServer>, String> {
    registry::list_servers(&state.db).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn register_mcp_server(
    state: State<'_, AppState>,
    payload: RegisterServerPayload,
) -> Result<McpServer, String> {
    if payload.id.trim().is_empty() || payload.name.trim().is_empty() || payload.url.trim().is_empty() {
        return Err("id, name y url son obligatorios".into());
    }
    registry::register_server(&state.db, payload).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_mcp_server(
    state: State<'_, AppState>,
    server_id: String,
) -> Result<(), String> {
    if server_id.trim().is_empty() {
        return Err("server_id requerido".into());
    }
    registry::delete_server(&state.db, &server_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn ping_mcp_server(
    state: State<'_, AppState>,
    server_id: String,
) -> Result<PingResult, String> {
    if server_id.trim().is_empty() {
        return Err("server_id requerido".into());
    }

    let url: String = sqlx::query_scalar("SELECT url FROM mcp_servers WHERE id = ?1")
        .bind(&server_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| format!("Servidor no encontrado: {e}"))?;

    let result = pinger::ping_server(&url).await;

    let _ = registry::update_server_status(
        &state.db, &server_id, result.online, result.latency_ms,
    ).await;

    Ok(result)
}

#[tauri::command]
pub async fn ping_mcp_server_url(
    url: String,
) -> Result<PingResult, String> {
    if url.trim().is_empty() {
        return Err("url requerida".into());
    }
    Ok(pinger::ping_server(&url).await)
}

#[tauri::command]
pub async fn list_mcp_tools(
    state: State<'_, AppState>,
    server_id: String,
) -> Result<Vec<McpTool>, String> {
    if server_id.trim().is_empty() {
        return Err("server_id requerido".into());
    }
    registry::list_tools(&state.db, &server_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn call_mcp_tool(
    state: State<'_, AppState>,
    payload: CallToolPayload,
) -> Result<CallToolResult, String> {
    if payload.server_id.trim().is_empty() || payload.tool.trim().is_empty() {
        return Err("server_id y tool son obligatorios".into());
    }

    let url: String = sqlx::query_scalar("SELECT url FROM mcp_servers WHERE id = ?1")
        .bind(&payload.server_id)
        .fetch_one(&state.db)
        .await
        .map_err(|e| format!("Servidor no encontrado: {e}"))?;

    geonexus_mcp::executor::call_tool(&state.db, &url, payload).await
}

#[tauri::command]
pub async fn list_mcp_allowlist(
    state: State<'_, AppState>,
    server_id: String,
) -> Result<Vec<AllowlistRule>, String> {
    if server_id.trim().is_empty() {
        return Err("server_id requerido".into());
    }
    registry::list_allowlist(&state.db, &server_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn upsert_mcp_allowlist(
    state: State<'_, AppState>,
    payload: UpsertAllowlistPayload,
) -> Result<AllowlistRule, String> {
    if payload.server_id.trim().is_empty() {
        return Err("server_id requerido".into());
    }
    registry::upsert_allowlist_rule(&state.db, payload).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_mcp_allowlist(
    state: State<'_, AppState>,
    rule_id: String,
) -> Result<(), String> {
    if rule_id.trim().is_empty() {
        return Err("rule_id requerido".into());
    }
    registry::delete_allowlist_rule(&state.db, &rule_id).await.map_err(|e| e.to_string())
}
