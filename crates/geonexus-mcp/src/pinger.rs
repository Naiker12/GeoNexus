use std::time::Instant;
use crate::handshake;
use crate::types::PingResult;

fn describe_http_status(status: u16, _auth_token: Option<&str>) -> &'static str {
    match status {
        401 => "Auth requerida (401) — configura token en Editar",
        403 => "Acceso denegado (403) — token sin permisos",
        404 => "Endpoint no encontrado (404) — verifica la URL del servidor MCP",
        405 => "Metodo no permitido (405) — servidor no acepta POST",
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
    let endpoint = handshake::build_base_url(url);
    let client = match handshake::build_client(10) {
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

    let init_payload = handshake::build_initialize_payload();
    let init_resp = match handshake::add_auth_header(client.post(&endpoint), auth_token)
        .json(&init_payload)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            let elapsed = start.elapsed().as_millis() as u64;
            let error = if e.is_timeout() {
                "Timeout — servidor no responde despues de 10s".to_string()
            } else if e.is_connect() {
                format!("Conexion fallida — {} ({})", e, endpoint)
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

    let init_body: serde_json::Value = match init_resp.json().await {
        Ok(v) => v,
        Err(e) => {
            return PingResult {
                online: false,
                latency_ms: Some(elapsed),
                error: Some(format!("Respuesta no es JSON-RPC valido: {e}")),
                protocol_version: None,
                tools_count: None,
                server_name: None,
            }
        }
    };

    if let Some(msg) = handshake::check_jsonrpc_error(&init_body) {
        return PingResult {
            online: false,
            latency_ms: Some(elapsed),
            error: Some(msg),
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

    let notif_payload = handshake::build_initialized_notification();
    let _ = handshake::add_auth_header(client.post(&endpoint), auth_token)
        .json(&notif_payload)
        .send()
        .await;

    let tools_list = handshake::fetch_tools_list(&client, &endpoint, auth_token, 2).await.ok();

    PingResult {
        online: true,
        latency_ms: Some(elapsed),
        error: if tools_list.is_none() {
            Some("Handshake OK pero tools/list no respondio".to_string())
        } else {
            None
        },
        protocol_version,
        tools_count: Some(tools_list.as_ref().map_or(0, |t| t.len())),
        server_name,
    }
}
