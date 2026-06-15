use std::time::{Duration, Instant};
use crate::types::PingResult;
use reqwest::Client;
use serde_json::{json, Value};

fn build_client() -> reqwest::Result<Client> {
    Client::builder()
        .timeout(Duration::from_secs(10))
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

fn build_base_url(url: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        url.trim_end_matches('/').to_string()
    } else {
        format!("http://{}", url.trim_end_matches('/'))
    }
}

fn describe_http_status(status: u16, _auth_token: Option<&str>) -> &'static str {
    match status {
        401 => "Auth requerida (401) — configura token en Editar",
        403 => "Acceso denegado (403) — token sin permisos",
        404 => "Endpoint no encontrado (404) — verifica la URL del servidor MCP",
        405 => "Método no permitido (405) — servidor no acepta POST",
        415 => "Content-Type rechazado (415) — servidor no acepta JSON-RPC",
        429 => "Rate limit excedido (429) — espera unos segundos",
        _ => {
            if status >= 500 {
                "Error interno del servidor MCP"
            } else {
                "Servidor no responde al protocolo MCP"
            }
        }
    }
}

pub async fn ping_server(url: &str) -> PingResult {
    ping_server_with_auth(url, None).await
}

pub async fn ping_server_with_auth(url: &str, auth_token: Option<&str>) -> PingResult {
    let endpoint = build_base_url(url);
    let client = match build_client() {
        Ok(c) => c,
        Err(e) => return PingResult {
            online: false,
            latency_ms: None,
            error: Some(format!("Error creando cliente HTTP: {e}")),
            protocol_version: None,
            tools_count: None,
            server_name: None,
        },
    };
    let start = Instant::now();

    // initialize
    let init_payload = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-03-26",
            "capabilities": { "tools": {} },
            "clientInfo": {
                "name": "geonexus-mcp-router",
                "version": "1.0.0"
            }
        }
    });

    let init_resp = match build_headers(client.post(&endpoint), auth_token)
        .json(&init_payload)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            let elapsed = start.elapsed().as_millis() as u64;
            let error = if e.is_timeout() {
                "Timeout — servidor no responde después de 10s".to_string()
            } else if e.is_connect() {
                format!("Conexión fallida — {} ({})", e, endpoint)
            } else {
                format!("Error HTTP: {e}")
            };
            return PingResult {
                online: false,
                latency_ms: Some(elapsed),
                error: Some(error),
                protocol_version: None,
                tools_count: None,
                server_name: None,
            }
        }
    };

    let elapsed = start.elapsed().as_millis() as u64;

    if !init_resp.status().is_success() {
        let status = init_resp.status().as_u16();
        return PingResult {
            online: false,
            latency_ms: Some(elapsed),
            error: Some(describe_http_status(status, auth_token).to_string()),
            protocol_version: None,
            tools_count: None,
            server_name: None,
        };
    }

    // Validar respuesta initialize
    let init_body: Value = match init_resp.json().await {
        Ok(v) => v,
        Err(e) => {
            return PingResult {
                online: false,
                latency_ms: Some(elapsed),
                error: Some(format!("Respuesta no es JSON-RPC válido: {e}")),
                protocol_version: None,
                tools_count: None,
                server_name: None,
            }
        }
    };

    // Verificar error JSON-RPC
    if let Some(err) = init_body.get("error") {
        return PingResult {
            online: false,
            latency_ms: Some(elapsed),
            error: Some(
                err.get("message")
                    .and_then(|m| m.as_str())
                    .unwrap_or("Error JSON-RPC en initialize")
                    .to_string()
            ),
            protocol_version: None,
            tools_count: None,
            server_name: None,
        };
    }

    let protocol_version = init_body["result"]["protocolVersion"]
        .as_str()
        .map(|s| s.to_string());
    let server_name = init_body["result"]["serverInfo"]["name"]
        .as_str()
        .map(|s| s.to_string());

    //notifications/initialized (sin id — no espera respuesta)
    let notif_payload = json!({
        "jsonrpc": "2.0",
        "method": "notifications/initialized"
    });

    let _ = build_headers(client.post(&endpoint), auth_token)
        .json(&notif_payload)
        .send()
        .await;

    //tools/list — descubrir tools disponibles
    let tools_payload = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list"
    });

    let tools_body: Option<Value> = match build_headers(client.post(&endpoint), auth_token)
        .json(&tools_payload)
        .send()
        .await
    {
        Ok(r) if r.status().is_success() => r.json().await.ok(),
        _ => None,
    };

    let tools_count = tools_body
        .as_ref()
        .and_then(|v| {
            if v.get("error").is_some() { None }
            else { v["result"]["tools"].as_array().map(|a| a.len()) }
        });

    PingResult {
        online: true,
        latency_ms: Some(elapsed),
        error: if tools_count.is_none() {
            Some("Handshake OK pero tools/list no respondió".to_string())
        } else {
            None
        },
        protocol_version,
        tools_count: tools_count.or(Some(0)),
        server_name,
    }
}
