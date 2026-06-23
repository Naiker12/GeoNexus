pub mod commands;
pub mod fetchers;
pub mod gateway;
pub mod sidecar;

#[cfg(test)]
mod tests;

pub use commands::*;
pub use sidecar::run_sidecar;
pub use sidecar::run_sidecar_streaming;
pub use sidecar::project_root;
pub use gateway::{GatewayClient, get_global_gateway};

#[derive(Debug, serde::Deserialize)]
pub struct LlmProviderConfig {
    pub provider_type: String,
    pub name: Option<String>,
    pub model: Option<String>,
    pub endpoint: String,
    #[serde(default)]
    pub supports_embeddings: bool,
}

#[derive(Debug, serde::Deserialize)]
pub struct LlmChatRequest {
    pub provider_type: String,
    pub model: String,
    pub endpoint: String,
    pub prompt: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct LlmPingResult {
    pub status: String,
    pub provider_type: String,
    pub model: Option<String>,
    pub latency_ms: Option<i64>,
    pub message: Option<String>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct LlmChatResult {
    pub status: String,
    pub provider_type: String,
    pub model: Option<String>,
    pub text: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmModelInfo {
    pub id: String,
    pub name: String,
    pub context_length: Option<u32>,
    pub is_free: Option<bool>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListLlmModelsInput {
    pub provider: String,
    pub endpoint: String,
    pub api_key: Option<String>,
}
