use crate::commands::llm::{LlmProviderConfig, LlmPingResult, LlmChatRequest, LlmChatResult, ListLlmModelsInput, LlmModelInfo};
use crate::commands::llm::sidecar::run_sidecar;
use crate::commands::llm::gateway::get_global_gateway;
use crate::commands::llm::fetchers::{
    fetch_ollama_models, fetch_openai_compat_models, fetch_openrouter_models, fetch_openai_models,
    anthropic_known_models,
};

#[tauri::command]
pub async fn ping_llm_provider(config: LlmProviderConfig) -> Result<LlmPingResult, String> {
    if config.provider_type.trim().is_empty() {
        return Err("provider_type requerido".into());
    }
    if config.endpoint.trim().is_empty() {
        return Err("endpoint requerido".into());
    }

    let output = run_sidecar(&[
        "--action",
        "ping_llm",
        "--provider_type",
        &config.provider_type,
        "--base_url",
        &config.endpoint,
        "--model",
        config.model.as_deref().unwrap_or(""),
    ])?;

    serde_json::from_str(&output)
        .map_err(|e| format!("Error deserializando ping LLM: {e}. Output: {output}"))
}

#[tauri::command]
pub async fn send_llm_message(request: LlmChatRequest) -> Result<LlmChatResult, String> {
    if request.provider_type.trim().is_empty() {
        return Err("provider_type requerido".into());
    }
    if request.endpoint.trim().is_empty() {
        return Err("endpoint requerido".into());
    }
    if request.model.trim().is_empty() {
        return Err("model requerido".into());
    }
    if request.prompt.trim().is_empty() {
        return Err("prompt requerido".into());
    }

    let output = run_sidecar(&[
        "--action",
        "chat_llm",
        "--provider_type",
        &request.provider_type,
        "--base_url",
        &request.endpoint,
        "--model",
        &request.model,
        "--prompt",
        &request.prompt,
    ])?;

    serde_json::from_str(&output)
        .map_err(|e| format!("Error deserializando chat LLM: {e}. Output: {output}"))
}

/// Lista modelos disponibles desde Rust usando reqwest.
/// Evita CORS y problemas de localhost que ocurren desde el webview.
#[tauri::command]
pub async fn list_llm_models(
    input: ListLlmModelsInput,
) -> Result<Vec<LlmModelInfo>, String> {
    if input.endpoint.trim().is_empty() {
        return Err("endpoint requerido".into());
    }
    if input.provider.trim().is_empty() {
        return Err("provider requerido".into());
    }

    let provider = input.provider.to_lowercase();

    match provider.as_str() {
        "ollama" => fetch_ollama_models(&input.endpoint).await,
        "lmstudio" | "lm_studio" => fetch_openai_compat_models(&input.endpoint, None).await,
        "openrouter" => {
            let key = input.api_key.as_deref().unwrap_or("");
            fetch_openrouter_models(key).await
        }
        "openai" => {
            let key = input.api_key.as_deref().unwrap_or("");
            fetch_openai_models(key).await
        }
        "anthropic" => Ok(anthropic_known_models()),
        _ => {
            let key = input.api_key.as_deref();
            fetch_openai_compat_models(&input.endpoint, key).await
        }
    }
}

#[tauri::command]
pub async fn call_gateway_action(
    action: String,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let gateway = get_global_gateway()
        .ok_or_else(|| "Gateway no inicializado".to_string())?;

    let response = gateway.send_json(&action, params).await?;

    let response_type = response.get("type").and_then(|v| v.as_str()).unwrap_or("");
    if response_type == "error" {
        let msg = response
            .get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("Error del gateway");
        return Err(msg.to_string());
    }

    Ok(response.get("data").cloned().unwrap_or(response))
}
