use std::time::Instant;
use crate::types::PingResult;

pub async fn ping_server(url: &str) -> PingResult {
    let health_url = build_health_url(url);
    let start = Instant::now();

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
            error: Some(e.to_string()),
        },
    }
}

fn build_health_url(url: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        format!("{}/health", url.trim_end_matches('/'))
    } else {
        format!("http://{}/health", url)
    }
}
