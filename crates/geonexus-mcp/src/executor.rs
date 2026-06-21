use std::time::Instant;
use sqlx::SqlitePool;
use crate::handshake;
use crate::types::*;
use crate::registry;
use serde_json::{json, Value};

pub async fn call_tool_for_server(
    pool: &SqlitePool,
    server: &McpServer,
    payload: CallToolPayload,
) -> Result<CallToolResult, String> {
    let allowlist_rule = registry::check_allowlist(pool, &payload.server_id, &payload.tool)
        .await
        .map_err(|e| format!("Error checking allowlist: {e}"))?;

    match &allowlist_rule {
        Some(rule) if !rule.allowed => {
            return Ok(CallToolResult {
                success: false,
                data: None,
                error: Some(format!("Tool '{}' blocked by allowlist", payload.tool)),
                duration_ms: 0,
            });
        }
        Some(rule) => {
            if let Some(limit_secs) = rule.rate_limit {
                if let Some(ref last) = rule.last_called_at {
                    if let Ok(elapsed) = elapsed_seconds_since(last) {
                        if elapsed < limit_secs as u64 {
                            return Ok(CallToolResult {
                                success: false,
                                data: None,
                                error: Some(format!(
                                    "Rate limit for '{}': {}s between calls, only {}s elapsed",
                                    payload.tool, limit_secs, elapsed
                                )),
                                duration_ms: 0,
                            });
                        }
                    }
                }
            }
        }
        None => {}
    }

    let start = Instant::now();
    let result = match server.transport {
        McpTransport::Stdio => call_stdio_tool(server, &payload).await,
        McpTransport::Http | McpTransport::Sse => {
            if server.url.is_empty() {
                Err("Servidor HTTP sin URL configurada".into())
            } else {
                let auth_token = server.auth_token.as_deref().or(server.auth_ref.as_deref());
                call_http_tool(&server.url, &payload, auth_token).await
            }
        }
    };
    let duration_ms = start.elapsed().as_millis() as u64;

    let result = match result {
        Ok(data) => {
            let is_error = data
                .get("isError")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            CallToolResult {
                success: !is_error,
                data: Some(data),
                error: if is_error {
                    Some("La herramienta MCP devolvió un error".into())
                } else {
                    None
                },
                duration_ms,
            }
        }
        Err(e) => CallToolResult {
            success: false,
            data: None,
            error: Some(e),
            duration_ms,
        },
    };

    let status = if result.success { "success" } else { "error" };
    finish_call(pool, payload, result, status, allowlist_rule).await
}

pub async fn call_tool(
    pool: &SqlitePool,
    server_url: &str,
    payload: CallToolPayload,
    auth_token: Option<&str>,
) -> Result<CallToolResult, String> {
    let _ = auth_token;
    let server = registry::get_server(pool, &payload.server_id)
        .await
        .map_err(|e| format!("Servidor no encontrado: {e}"))?;

    if server.transport == McpTransport::Stdio {
        return call_tool_for_server(pool, &server, payload).await;
    }

    if !server_url.is_empty() && server.url != server_url {
        // Compatibilidad con callers que pasan URL explícita
    }

    call_tool_for_server(pool, &server, payload).await
}

async fn call_stdio_tool(server: &McpServer, payload: &CallToolPayload) -> Result<Value, String> {
    let command = server
        .command
        .as_deref()
        .ok_or("Servidor STDIO sin command configurado")?;
    let args = server.args.clone().unwrap_or_default();
    let env = server.env.as_ref().and_then(|v| v.as_object());
    let timeout = server.timeout_ms.unwrap_or(30_000) as u64;

    crate::stdio::call_tool(
        command,
        &args,
        env,
        timeout,
        &payload.tool,
        &payload.args,
    )
    .await
}

async fn call_http_tool(
    server_url: &str,
    payload: &CallToolPayload,
    auth_token: Option<&str>,
) -> Result<Value, String> {
    let endpoint = server_url.trim_end_matches('/');
    let client = handshake::build_client(30)
        .map_err(|e| format!("Error creando cliente HTTP: {e}"))?;

    handshake::do_handshake(&client, endpoint, auth_token).await?;

    let call_payload = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": payload.tool,
            "arguments": payload.args,
        }
    });

    let response = handshake::add_auth_header(client.post(endpoint), auth_token)
        .json(&call_payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    let json: Value = response.json().await.map_err(|e| e.to_string())?;
    if let Some(err) = json.get("error") {
        return Err(
            err.get("message")
                .and_then(|m| m.as_str())
                .unwrap_or("Error JSON-RPC")
                .to_string(),
        );
    }
    json.get("result")
        .cloned()
        .ok_or_else(|| "Respuesta JSON-RPC inválida: sin result ni error".into())
}

async fn finish_call(
    pool: &SqlitePool,
    payload: CallToolPayload,
    result: CallToolResult,
    result_status: &str,
    allowlist_rule: Option<AllowlistRule>,
) -> Result<CallToolResult, String> {
    let _ = registry::audit_tool_call(
        pool,
        &payload.server_id,
        &payload.tool,
        Some(&serde_json::to_string(&payload.args).unwrap_or_default()),
        result.data.as_ref().map(|d| d.to_string()).as_deref(),
        result_status,
        result.duration_ms as i64,
        &payload.trace_id,
        payload.agent_name.as_deref(),
    )
    .await;

    if let Some(rule) = allowlist_rule {
        if rule.rate_limit.is_some() {
            let _ = registry::update_last_called_at(pool, &payload.server_id, &payload.tool).await;
        }
    }

    Ok(result)
}

fn elapsed_seconds_since(dt: &str) -> Result<u64, String> {
    let now = chrono::Utc::now();
    let last = chrono::NaiveDateTime::parse_from_str(dt, "%Y-%m-%d %H:%M:%S")
        .map_err(|e| format!("Error parsing last_called_at '{dt}': {e}"))?
        .and_utc();
    Ok((now - last).num_seconds().max(0) as u64)
}
