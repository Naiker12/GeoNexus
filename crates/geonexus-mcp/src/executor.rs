use std::time::Instant;
use sqlx::SqlitePool;
use uuid::Uuid;
use crate::types::*;
use crate::registry;

pub async fn call_tool(
    pool: &SqlitePool,
    server_url: &str,
    payload: CallToolPayload,
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
    let client = reqwest::Client::new();

    let request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": Uuid::new_v4().to_string(),
        "method": "tools/call",
        "params": {
            "name": payload.tool,
            "arguments": payload.args,
        }
    });

    let response = client
        .post(endpoint)
        .json(&request)
        .send()
        .await;

    let duration_ms = start.elapsed().as_millis() as u64;

    let result = match response {
        Ok(resp) if resp.status().is_success() => {
            match resp.json::<serde_json::Value>().await {
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
