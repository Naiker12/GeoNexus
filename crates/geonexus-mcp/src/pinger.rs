use std::time::Instant;
use crate::types::PingResult;
use uuid::Uuid;

pub async fn ping_server(url: &str) -> PingResult {
    let endpoint = build_base_url(url);
    let start = Instant::now();

    let request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": Uuid::new_v4().to_string(),
        "method": "ping",
    });

    match reqwest::Client::new()
        .post(&endpoint)
        .json(&request)
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            match resp.json::<serde_json::Value>().await {
                Ok(json) if json.get("result").is_some() => PingResult {
                    online: true,
                    latency_ms: Some(start.elapsed().as_millis() as u64),
                    error: None,
                },
                Ok(json) => PingResult {
                    online: false,
                    latency_ms: Some(start.elapsed().as_millis() as u64),
                    error: json
                        .get("error")
                        .and_then(|e| e.get("message"))
                        .and_then(|m| m.as_str())
                        .map(|s| s.to_string())
                        .or(Some("Respuesta JSON-RPC inválida".into())),
                },
                Err(_) => try_legacy_health(&endpoint, &start).await,
            }
        }
        _ => try_legacy_health(&endpoint, &start).await,
    }
}

async fn try_legacy_health(endpoint: &str, start: &Instant) -> PingResult {
    let health_url = format!("{}/health", endpoint);
    match reqwest::get(&health_url).await {
        Ok(resp) if resp.status().is_success() => PingResult {
            online: true,
            latency_ms: Some(start.elapsed().as_millis() as u64),
            error: None,
        },
        Ok(resp) => PingResult {
            online: false,
            latency_ms: Some(start.elapsed().as_millis() as u64),
            error: Some(format!("HTTP {}", resp.status())),
        },
        Err(e) => PingResult {
            online: false,
            latency_ms: None,
            error: Some(format!("{e} (fallback /health también falló)")),
        },
    }
}

fn build_base_url(url: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        url.trim_end_matches('/').to_string()
    } else {
        format!("http://{}", url.trim_end_matches('/'))
    }
}
