use std::time::Instant;
use sqlx::SqlitePool;
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

    let endpoint = format!("{}/tools/{}", server_url.trim_end_matches('/'), payload.tool);
    let start = Instant::now();
    let client = reqwest::Client::new();

    let response = client
        .post(&endpoint)
        .json(&payload.args)
        .send()
        .await;

    let duration_ms = start.elapsed().as_millis() as u64;

    let result = match response {
        Ok(resp) if resp.status().is_success() => {
            let data = resp.json::<serde_json::Value>().await.ok();
            CallToolResult { success: true, data, error: None, duration_ms }
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
        result.data.as_ref().map(|d| serde_json::to_string(d).unwrap_or_default()).as_deref(),
        result_status,
        duration_ms as i64,
        &payload.trace_id,
        payload.agent_name.as_deref(),
    ).await;

    Ok(result)
}
