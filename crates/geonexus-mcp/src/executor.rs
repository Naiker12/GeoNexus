use std::time::{Duration, Instant};
use sqlx::SqlitePool;
use crate::types::*;
use crate::registry;
use reqwest::Client;
use serde_json::{json, Value};

fn build_client() -> reqwest::Result<Client> {
    Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
}

fn build_headers(request: reqwest::RequestBuilder, auth_token: Option<&str>) -> reqwest::RequestBuilder {
    let request = request
        .header("Content-Type", "application/json")
        .header("Accept", "application/json, text/event-stream");
    if let Some(token) = auth_token {
        request.header("Authorization", format!("Bearer {}", token))
    } else {
        request
    }
}

async fn do_handshake(client: &Client, endpoint: &str, auth_token: Option<&str>) -> Result<(), String> {
    // PASO 1: initialize
    let init_payload = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-06-18",
            "capabilities": { "tools": {} },
            "clientInfo": {
                "name": "geonexus",
                "version": "1.0.0"
            }
        }
    });

    let init_resp = build_headers(client.post(endpoint), auth_token)
        .json(&init_payload)
        .send()
        .await
        .map_err(|e| format!("Error en initialize: {e}"))?;

    if !init_resp.status().is_success() {
        return Err(format!("initialize falló: HTTP {}", init_resp.status()));
    }

    let init_body: Value = init_resp.json().await
        .map_err(|e| format!("Respuesta initialize inválida: {e}"))?;

    if let Some(err) = init_body.get("error") {
        return Err(
            err.get("message")
                .and_then(|m| m.as_str())
                .unwrap_or("Error JSON-RPC en initialize")
                .to_string()
        );
    }

    // PASO 2: notifications/initialized
    let notif_payload = json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });

    let _ = build_headers(client.post(endpoint), auth_token)
        .json(&notif_payload)
        .send()
        .await;

    Ok(())
}

pub async fn call_tool(
    pool: &SqlitePool,
    server_url: &str,
    payload: CallToolPayload,
    auth_token: Option<&str>,
) -> Result<CallToolResult, String> {
    let allowed = registry::check_allowlist(pool, &payload.server_id, &payload.tool)
        .await
        .map_err(|e| format!("Error checking allowlist: {e}"))?;

    if !allowed {
        return Ok(CallToolResult {
            success: false,
            data: None,
            error: Some(format!("Tool '{}' blocked by allowlist", payload.tool)),
            duration_ms: 0,
        });
    }

    let endpoint = server_url.trim_end_matches('/');
    let start = Instant::now();
    let client = build_client().map_err(|e| format!("Error creando cliente HTTP: {e}"))?;

    // Handshake completo (stateless — necesario por request)
    do_handshake(&client, endpoint, auth_token).await?;

    // tools/call — la llamada real
    let call_payload = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": payload.tool,
            "arguments": payload.args,
        }
    });

    let response = build_headers(client.post(endpoint), auth_token)
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

    Ok(result)
}
