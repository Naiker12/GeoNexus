use crate::constants::{MCP_CLIENT_NAME, MCP_CLIENT_VERSION, MCP_PROTOCOL_VERSION};
use serde_json::{json, Value};
use std::time::Duration;

pub fn build_initialize_payload() -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": MCP_PROTOCOL_VERSION,
            "capabilities": { "tools": {} },
            "clientInfo": {
                "name": MCP_CLIENT_NAME,
                "version": MCP_CLIENT_VERSION
            }
        }
    })
}

pub fn build_initialized_notification() -> Value {
    json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    })
}

pub fn build_tools_list_payload(id: u64) -> Value {
    json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": "tools/list"
    })
}

pub fn build_client(timeout_secs: u64) -> Result<reqwest::Client, reqwest::Error> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .build()
}

pub fn add_auth_header(
    request: reqwest::RequestBuilder,
    auth_token: Option<&str>,
) -> reqwest::RequestBuilder {
    let request = request
        .header("Content-Type", "application/json")
        .header("Accept", "application/json, text/event-stream");
    if let Some(token) = auth_token {
        request.header("Authorization", format!("Bearer {}", token))
    } else {
        request
    }
}

pub fn build_base_url(url: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        url.trim_end_matches('/').to_string()
    } else {
        format!("http://{}", url.trim_end_matches('/'))
    }
}

pub fn check_jsonrpc_error(body: &Value) -> Option<String> {
    body.get("error").map(|err| {
        err.get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("Error JSON-RPC")
            .to_string()
    })
}

pub async fn do_handshake(
    client: &reqwest::Client,
    endpoint: &str,
    auth_token: Option<&str>,
) -> Result<String, String> {
    let init_payload = build_initialize_payload();
    let init_resp = add_auth_header(client.post(endpoint), auth_token)
        .json(&init_payload)
        .send()
        .await
        .map_err(|e| format!("Error en initialize: {e}"))?;

    if !init_resp.status().is_success() {
        return Err(format!("initialize fallo: HTTP {}", init_resp.status()));
    }

    let init_body: Value = init_resp
        .json()
        .await
        .map_err(|e| format!("Respuesta initialize invalida: {e}"))?;

    if let Some(msg) = check_jsonrpc_error(&init_body) {
        return Err(msg);
    }

    let server_name = init_body["result"]["serverInfo"]["name"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Respuesta initialize invalida: falta serverInfo.name".to_string())?;

    let notif_payload = build_initialized_notification();
    let _ = add_auth_header(client.post(endpoint), auth_token)
        .json(&notif_payload)
        .send()
        .await;

    Ok(server_name)
}

pub async fn fetch_tools_list(
    client: &reqwest::Client,
    endpoint: &str,
    auth_token: Option<&str>,
    id: u64,
) -> Result<Vec<Value>, String> {
    let tools_payload = build_tools_list_payload(id);
    let response = add_auth_header(client.post(endpoint), auth_token)
        .json(&tools_payload)
        .send()
        .await
        .map_err(|e| format!("Error en tools/list: {e}"))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {} en tools/list", response.status()));
    }

    let json: Value = response
        .json()
        .await
        .map_err(|e| format!("Error parsing tools/list: {e}"))?;

    if let Some(msg) = check_jsonrpc_error(&json) {
        return Err(msg);
    }

    json.get("result")
        .and_then(|r| r.get("tools"))
        .and_then(|t| t.as_array())
        .cloned()
        .ok_or_else(|| "Respuesta tools/list invalida: falta result.tools".to_string())
}
