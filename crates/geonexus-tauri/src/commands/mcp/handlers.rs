use tauri::State;
use serde_json::{json, Value};
use crate::AppState;
use geonexus_mcp::types::*;
use geonexus_mcp::{registry, pinger, stdio};

fn get_auth_token(server: &McpServer) -> Option<String> {
    server.auth_token.clone()
        .or_else(|| server.auth_ref.clone())
}

fn is_http_server(server: &McpServer) -> bool {
    server.transport == McpTransport::Http || server.transport == McpTransport::Sse
}

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
    if payload.id.trim().is_empty() || payload.name.trim().is_empty() {
        return Err("id y name son obligatorios".into());
    }
    let transport = payload.transport.as_deref().unwrap_or("http");
    if transport == "http" && payload.url.trim().is_empty() {
        return Err("url es obligatoria para servidores HTTP".into());
    }
    let server = registry::register_server(&state.db, payload).await.map_err(|e| e.to_string())?;

    // Auto-descubrir tools si es STDIO
    if server.transport == McpTransport::Stdio {
        if let Some(ref cmd) = server.command {
            let args = server.args.clone().unwrap_or_default();
            let timeout = server.timeout_ms.unwrap_or(30000) as u64;
            let env = server.env.as_ref().and_then(|v| v.as_object());
            match stdio::discover_tools(cmd, &args, env, timeout).await {
                Ok(tools) => {
                    for tool in &tools {
                        let category = registry::infer_tool_category(&tool.name, &tool.description);
                        let args_json = tool.input_schema.as_ref()
                            .map(|s| serde_json::to_string(s).unwrap_or_default())
                            .unwrap_or_default();
                        let _ = registry::upsert_tool(
                            &state.db, &server.id, &tool.name, &category,
                            &tool.description, &args_json, "",
                        ).await;
                    }
                    let _ = sqlx::query("UPDATE mcp_servers SET tools_count = ?1 WHERE id = ?2")
                        .bind(tools.len() as i32)
                        .bind(&server.id)
                        .execute(&state.db)
                        .await;
                }
                Err(e) => {
                    eprintln!("[mcp] Auto-discover de tools falló para {}: {}", server.id, e);
                }
            }
        }
    }

    Ok(server)
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

    let server = registry::get_server(&state.db, &server_id)
        .await
        .map_err(|e| format!("Servidor no encontrado: {e}"))?;

    // Saltar ping para servidores stdio (no tienen URL HTTP)
    if !is_http_server(&server) || server.url.is_empty() {
        return Ok(PingResult {
            online: false,
            latency_ms: None,
            error: Some("Servidor stdio — no se puede hacer ping HTTP".into()),
            protocol_version: None,
            tools_count: None,
            server_name: None,
        });
    }

    let auth_token = get_auth_token(&server);
    let result = pinger::ping_server_with_auth(&server.url, auth_token.as_deref()).await;

    let _ = registry::update_server_ping_result(
        &state.db, &server_id, result.online, result.latency_ms,
        result.tools_count.map(|c| c as i32),
        result.protocol_version.as_deref(),
        result.error.as_deref(),
    ).await;

    if !result.online {
        let _ = sqlx::query(
            "UPDATE mcp_servers SET error_count = error_count + 1 WHERE id = ?1"
        )
        .bind(&server_id)
        .execute(&state.db)
        .await;
    }

    let err_count: i32 = sqlx::query_scalar("SELECT error_count FROM mcp_servers WHERE id = ?1")
        .bind(&server_id)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    let _ = registry::record_server_metric(
        &state.db, &server_id,
        if result.online { "online" } else { "offline" },
        result.latency_ms, err_count,
    ).await;

    if result.online {
        let auth = get_auth_token(&server);
        let _ = registry::auto_discover_tools(
            &state.db, &server.url, &server_id, auth.as_deref(),
        ).await;
    }

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

    let server = registry::get_server(&state.db, &payload.server_id)
        .await
        .map_err(|e| format!("Servidor no encontrado: {e}"))?;

    if !is_http_server(&server) || server.url.is_empty() {
        return Err("No se puede llamar tools en servidores stdio a través de HTTP".into());
    }

    let auth_token = get_auth_token(&server);
    geonexus_mcp::executor::call_tool(&state.db, &server.url, payload, auth_token.as_deref()).await
}

// ── Import / Export ──────────────────────────────────────────────

#[tauri::command]
pub async fn import_mcp_config(
    state: State<'_, AppState>,
    config_json: String,
) -> Result<ImportResult, String> {
    let config: McpConfigFile = serde_json::from_str(&config_json)
        .map_err(|e| format!("JSON inválido: {e}"))?;

    let mut imported = 0usize;
    let mut skipped = 0usize;
    let mut errors = vec![];

    for (server_key, server_def) in config.mcp_servers {
        let id = server_key.clone();
        let transport = match server_def.server_type.as_deref() {
            Some("http") | Some("sse") => server_def.server_type.unwrap(),
            _ => "stdio".to_string(),
        };

        let payload = RegisterServerPayload {
            id: id.clone(),
            name: server_def.name.unwrap_or_else(|| server_key.clone()),
            url: server_def.url.unwrap_or_default(),
            transport: Some(transport),
            auth_type: None,
            auth_ref: None,
            auth_token: server_def.headers
                .as_ref()
                .and_then(|h| h.get("Authorization"))
                .and_then(|v| v.as_str())
                .and_then(|s| s.strip_prefix("Bearer "))
                .map(|s| s.to_string()),
            command: server_def.command,
            args: server_def.args,
            env: server_def.env,
            headers: server_def.headers,
            disabled: server_def.disabled,
            auto_approve: server_def.auto_approve,
            timeout_ms: server_def.timeout,
            tools: None,
        };

        match registry::register_server(&state.db, payload).await {
            Ok(server) => {
                imported += 1;
                // Auto-descubrir tools para STDIO
                if server.transport == McpTransport::Stdio {
                    if let Some(ref cmd) = server.command {
                        let args = server.args.clone().unwrap_or_default();
                        let timeout = server.timeout_ms.unwrap_or(30000) as u64;
                        let env = server.env.as_ref().and_then(|v| v.as_object());
                        if let Ok(tools) = stdio::discover_tools(cmd, &args, env, timeout).await {
                            for tool in &tools {
                                let category = registry::infer_tool_category(&tool.name, &tool.description);
                                let args_json = tool.input_schema.as_ref()
                                    .map(|s| serde_json::to_string(s).unwrap_or_default())
                                    .unwrap_or_default();
                                let _ = registry::upsert_tool(
                                    &state.db, &server.id, &tool.name, &category,
                                    &tool.description, &args_json, "",
                                ).await;
                            }
                            let _ = sqlx::query("UPDATE mcp_servers SET tools_count = ?1 WHERE id = ?2")
                                .bind(tools.len() as i32)
                                .bind(&server.id)
                                .execute(&state.db)
                                .await;
                        }
                    }
                }
            }
            Err(e) => {
                let msg = e.to_string();
                if msg.contains("UNIQUE") {
                    skipped += 1;
                } else {
                    errors.push(format!("{}: {}", id, msg));
                }
            }
        }
    }

    Ok(ImportResult { imported, skipped, errors })
}

#[tauri::command]
pub async fn export_mcp_config(
    state: State<'_, AppState>,
) -> Result<String, String> {
    let servers = registry::list_servers(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let mut mcp_servers = serde_json::Map::new();

    for server in servers {
        let mut entry = serde_json::Map::new();

        match server.transport {
            McpTransport::Http | McpTransport::Sse => {
                entry.insert("type".into(), json!("http"));
                if !server.url.is_empty() {
                    entry.insert("url".into(), json!(server.url));
                }
                if let Some(ref headers) = server.headers {
                    entry.insert("headers".into(), headers.clone());
                }
            }
            McpTransport::Stdio => {
                if let Some(ref cmd) = server.command {
                    entry.insert("command".into(), json!(cmd));
                }
                if let Some(ref args) = server.args {
                    entry.insert("args".into(), json!(args));
                }
                if let Some(ref env) = server.env {
                    entry.insert("env".into(), env.clone());
                }
            }
        }

        if server.disabled {
            entry.insert("disabled".into(), json!(true));
        }
        if let Some(timeout) = server.timeout_ms {
            entry.insert("timeout".into(), json!(timeout));
        }
        if let Some(ref approve) = server.auto_approve {
            if !approve.is_empty() {
                entry.insert("autoApprove".into(), json!(approve));
            }
        }

        mcp_servers.insert(server.id, Value::Object(entry));
    }

    let config = json!({ "mcpServers": mcp_servers });
    serde_json::to_string_pretty(&config).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn discover_mcp_tools(
    state: State<'_, AppState>,
    server_id: String,
) -> Result<usize, String> {
    if server_id.trim().is_empty() {
        return Err("server_id requerido".into());
    }

    let server = registry::get_server(&state.db, &server_id)
        .await
        .map_err(|e| format!("Servidor no encontrado: {e}"))?;

    let discovered = match server.transport {
        McpTransport::Stdio => {
            let cmd = server.command.clone()
                .ok_or("El servidor STDIO no tiene comando definido")?;
            let args = server.args.clone().unwrap_or_default();
            let timeout = server.timeout_ms.unwrap_or(30000) as u64;
            let env = server.env.as_ref().and_then(|v| v.as_object());
            let tools = geonexus_mcp::stdio::discover_tools(&cmd, &args, env, timeout).await?;
            let count = tools.len();
            for tool in &tools {
                let category = registry::infer_tool_category(&tool.name, &tool.description);
                let args_json = tool.input_schema.as_ref()
                    .map(|s| serde_json::to_string(s).unwrap_or_default())
                    .unwrap_or_default();
                let _ = registry::upsert_tool(
                    &state.db, &server_id, &tool.name, &category,
                    &tool.description, &args_json, "",
                ).await;
            }
            count
        }
        McpTransport::Http | McpTransport::Sse => {
            let auth_token = get_auth_token(&server);
            registry::auto_discover_tools(
                &state.db, &server.url, &server.id, auth_token.as_deref(),
            ).await?
        }
    };

    if discovered == 0 {
        return Err("El servidor no reportó tools".into());
    }

    // Actualizar tools_count
    let _ = sqlx::query("UPDATE mcp_servers SET tools_count = ?1 WHERE id = ?2")
        .bind(discovered as i32)
        .bind(&server_id)
        .execute(&state.db)
        .await;

    Ok(discovered)
}

// ── Allowlist ────────────────────────────────────────────────────

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

#[derive(serde::Serialize)]
pub struct PreviewTool {
    pub name: String,
    pub description: String,
}

/// Descubre tools desde una URL HTTP o comando STDIO sin persistir (preview).
#[tauri::command]
pub async fn preview_mcp_tools(
    url: Option<String>,
    command: Option<String>,
    args: Option<Vec<String>>,
    auth_token: Option<String>,
) -> Result<Vec<PreviewTool>, String> {
    if let Some(url) = url.filter(|u| !u.is_empty()) {
        let tools = registry::preview_http_tools(&url, auth_token.as_deref()).await?;
        return Ok(tools.into_iter().map(|t| PreviewTool {
            name: t.name,
            description: t.description,
        }).collect());
    }

    if let Some(cmd) = command.filter(|c| !c.is_empty()) {
        let the_args = args.unwrap_or_default();
        let tools = stdio::discover_tools(&cmd, &the_args, None, 15000).await?;
        return Ok(tools.into_iter().map(|t| PreviewTool {
            name: t.name,
            description: t.description,
        }).collect());
    }

    Err("Se requiere URL (HTTP) o comando (STDIO)".into())
}
