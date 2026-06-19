use std::time::Instant;
use sqlx::SqlitePool;
use crate::handshake;
use crate::types::*;
use crate::registry;
use serde_json::{json, Value};

pub async fn call_tool(
    pool: &SqlitePool,
    server_url: &str,
    payload: CallToolPayload,
    auth_token: Option<&str>,
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

    let endpoint = server_url.trim_end_matches('/');
    let start = Instant::now();
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
        .await;

    let duration_ms = start.elapsed().as_millis() as u64;

    let result = match response {
        Ok(resp) if resp.status().is_success() => {
            match resp.json::<Value>().await {
                Ok(json) => {
                    if let Some(err) = json.get("error") {
                        CallToolResult {
                            success: false,
                            data: None,
                            error: Some(
                                err.get("message")
                                    .and_then(|m| m.as_str())
                                    .unwrap_or("Error JSON-RPC")
                                    .to_string()
                            ),
                            duration_ms,
                        }
                    } else if let Some(result_val) = json.get("result") {
                        let is_error = result_val
                            .get("isError")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false);
                        CallToolResult {
                            success: !is_error,
                            data: Some(result_val.clone()),
                            error: if is_error {
                                Some("Tool returned error".into())
                            } else {
                                None
                            },
                            duration_ms,
                        }
                    } else {
                        CallToolResult {
                            success: false,
                            data: None,
                            error: Some("Respuesta JSON-RPC inválida: sin result ni error".into()),
                            duration_ms,
                        }
                    }
                }
                Err(e) => CallToolResult {
                    success: false,
                    data: None,
                    error: Some(format!("Error parsing JSON-RPC response: {e}")),
                    duration_ms,
                },
            }
        }
        Ok(resp) => CallToolResult {
            success: false,
            data: None,
            error: Some(format!("HTTP {}", resp.status())),
            duration_ms,
        },
        Err(e) => CallToolResult {
            success: false,
            data: None,
            error: Some(e.to_string()),
            duration_ms,
        },
    };

    let result_status = if result.success { "success" } else { "error" };
    let _ = registry::audit_tool_call(
        pool,
        &payload.server_id,
        &payload.tool,
        Some(&serde_json::to_string(&payload.args).unwrap_or_default()),
        result.data.as_ref().map(|d| d.to_string()).as_deref(),
        result_status,
        duration_ms as i64,
        &payload.trace_id,
        payload.agent_name.as_deref(),
    ).await;

    // Actualizar last_called_at para rate limiting
    if let Some(rule) = allowlist_rule {
        if rule.rate_limit.is_some() {
            let _ = registry::update_last_called_at(pool, &payload.server_id, &payload.tool).await;
        }
    }

    Ok(result)
}

fn elapsed_seconds_since(dt: &str) -> Result<u64, String> {
    // Formato esperado: "2026-06-19 12:34:56"
    let now = chrono::Utc::now();
    let last = chrono::NaiveDateTime::parse_from_str(dt, "%Y-%m-%d %H:%M:%S")
        .map_err(|e| format!("Error parsing last_called_at '{dt}': {e}"))?
        .and_utc();
    Ok((now - last).num_seconds().max(0) as u64)
}
