use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// ── Tipos existentes (ping y chat siguen usando sidecar Python) ──────────────

#[derive(Debug, Deserialize)]
pub struct LlmProviderConfig {
    pub provider_type: String,
    pub name: Option<String>,
    pub model: Option<String>,
    pub endpoint: String,
}

#[derive(Debug, Deserialize)]
pub struct LlmChatRequest {
    pub provider_type: String,
    pub model: String,
    pub endpoint: String,
    pub prompt: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmPingResult {
    pub status: String,
    pub provider_type: String,
    pub model: Option<String>,
    pub latency_ms: Option<i64>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmChatResult {
    pub status: String,
    pub provider_type: String,
    pub model: Option<String>,
    pub text: Option<String>,
    pub message: Option<String>,
}

// ── Nuevos tipos para list_llm_models nativo ────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmModelInfo {
    pub id: String,
    pub name: String,
    pub context_length: Option<u32>,
    pub is_free: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListLlmModelsInput {
    pub provider: String,
    pub endpoint: String,
    pub api_key: Option<String>,
}

// ── Comandos Tauri ────────────────────────────────────────────────────────────

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

// ── Ollama ────────────────────────────────────────────────────────────────────

async fn fetch_ollama_models(base: &str) -> Result<Vec<LlmModelInfo>, String> {
    let base = base.trim_end_matches('/');
    let url = format!("{base}/api/tags");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("No se pudo conectar a Ollama en {url}: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("Ollama devolvió status {}", resp.status()));
    }

    #[derive(Deserialize)]
    struct OllamaResponse {
        models: Vec<OllamaModel>,
    }
    #[derive(Deserialize)]
    struct OllamaModel {
        name: String,
    }

    let body: OllamaResponse = resp.json().await
        .map_err(|e| format!("Ollama respuesta inválida: {e}"))?;

    Ok(body.models.into_iter().map(|m| LlmModelInfo {
        id: m.name.clone(),
        name: m.name,
        context_length: None,
        is_free: None,
    }).collect())
}

// ── OpenAI-compatible (LM Studio, custom) ────────────────────────────────────

async fn fetch_openai_compat_models(
    base: &str,
    api_key: Option<&str>,
) -> Result<Vec<LlmModelInfo>, String> {
    let base = base.trim_end_matches('/');

    let urls = [
        format!("{base}/v1/models"),
        format!("{base}/models"),
    ];

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))?;

    let mut last_error = String::new();

    for url in &urls {
        let mut req = client.get(url);
        if let Some(key) = api_key {
            if !key.is_empty() {
                req = req.header("Authorization", format!("Bearer {key}"));
            }
        }

        match req.send().await {
            Ok(resp) if resp.status().is_success() => {
                return parse_openai_models_response(resp).await;
            }
            Ok(resp) => {
                last_error = format!("Status {}", resp.status());
            }
            Err(e) => {
                last_error = e.to_string();
            }
        }
    }

    Err(format!("No se pudo obtener modelos de {base}: {last_error}"))
}

// ── OpenRouter ────────────────────────────────────────────────────────────────

async fn fetch_openrouter_models(api_key: &str) -> Result<Vec<LlmModelInfo>, String> {
    if api_key.is_empty() {
        return Err("API key requerida para OpenRouter".into());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))?;

    let resp = client
        .get("https://openrouter.ai/api/v1/models")
        .header("Authorization", format!("Bearer {api_key}"))
        .header("HTTP-Referer", "https://geonexus.app")
        .send()
        .await
        .map_err(|e| format!("No se pudo conectar a OpenRouter: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("OpenRouter devolvió status {}", resp.status()));
    }

    #[derive(Deserialize)]
    struct OpenRouterResponse {
        data: Vec<OpenRouterModel>,
    }
    #[derive(Deserialize)]
    struct OpenRouterModel {
        id: String,
        name: String,
        context_length: Option<u32>,
        pricing: Option<OpenRouterPricing>,
    }
    #[derive(Deserialize)]
    struct OpenRouterPricing {
        prompt: Option<String>,
    }

    let body: OpenRouterResponse = resp.json().await
        .map_err(|e| format!("OpenRouter respuesta inválida: {e}"))?;

    Ok(body.data.into_iter().map(|m| {
        let is_free = m.pricing
            .as_ref()
            .and_then(|p| p.prompt.as_deref())
            .map(|price| price == "0" || price == "0.0");

        LlmModelInfo {
            id: m.id,
            name: m.name,
            context_length: m.context_length,
            is_free,
        }
    }).collect())
}

// ── OpenAI ────────────────────────────────────────────────────────────────────

async fn fetch_openai_models(api_key: &str) -> Result<Vec<LlmModelInfo>, String> {
    if api_key.is_empty() {
        return Err("API key requerida para OpenAI".into());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))?;

    let resp = client
        .get("https://api.openai.com/v1/models")
        .header("Authorization", format!("Bearer {api_key}"))
        .send()
        .await
        .map_err(|e| format!("No se pudo conectar a OpenAI: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("OpenAI devolvió status {}", resp.status()));
    }

    parse_openai_models_response(resp).await
}

// ── Anthropic — modelos hardcodeados ──────────────────────────────────────────

fn anthropic_known_models() -> Vec<LlmModelInfo> {
    vec![
        LlmModelInfo { id: "claude-opus-4-6".into(),   name: "Claude Opus 4.6".into(),   context_length: Some(200_000), is_free: Some(false) },
        LlmModelInfo { id: "claude-sonnet-4-6".into(), name: "Claude Sonnet 4.6".into(), context_length: Some(200_000), is_free: Some(false) },
        LlmModelInfo { id: "claude-haiku-4-5-20251001".into(), name: "Claude Haiku 4.5".into(), context_length: Some(200_000), is_free: Some(false) },
    ]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async fn parse_openai_models_response(
    resp: reqwest::Response,
) -> Result<Vec<LlmModelInfo>, String> {
    #[derive(Deserialize)]
    struct OpenAIResponse {
        data: Vec<OpenAIModel>,
    }
    #[derive(Deserialize)]
    struct OpenAIModel {
        id: String,
    }

    let body: OpenAIResponse = resp.json().await
        .map_err(|e| format!("Respuesta de modelos inválida: {e}"))?;

    let chat_models: Vec<LlmModelInfo> = body.data
        .into_iter()
        .filter(|m| !is_non_chat_model(&m.id))
        .map(|m| {
            let name = model_id_to_display_name(&m.id);
            LlmModelInfo {
                id: m.id,
                name,
                context_length: None,
                is_free: None,
            }
        })
        .collect();

    Ok(chat_models)
}

fn is_non_chat_model(id: &str) -> bool {
    let lower = id.to_lowercase();
    lower.contains("embed")
        || lower.contains("whisper")
        || lower.contains("tts")
        || lower.contains("dall-e")
        || lower.contains("moderation")
        || lower.contains("babbage")
        || lower.contains("davinci-0")
        || lower.contains("curie")
}

fn model_id_to_display_name(id: &str) -> String {
    match id {
        "gpt-4o"                => "GPT-4o".to_string(),
        "gpt-4o-mini"           => "GPT-4o Mini".to_string(),
        "gpt-4-turbo"           => "GPT-4 Turbo".to_string(),
        "gpt-3.5-turbo"         => "GPT-3.5 Turbo".to_string(),
        "o1"                    => "o1".to_string(),
        "o1-mini"               => "o1 Mini".to_string(),
        "o3-mini"               => "o3 Mini".to_string(),
        _ => id.to_string(),
    }
}

// ── Sidecar helpers (ping y chat aún lo usan) ────────────────────────────────

pub(crate) fn run_sidecar(args: &[&str]) -> Result<String, String> {
    run_sidecar_with_env(args, None)
}

fn run_sidecar_with_env(args: &[&str], env_var: Option<(&str, &str)>) -> Result<String, String> {
    let root_path = project_root();
    let python_exe = python_executable(&root_path);
    let sidecar_script = root_path.join("ai").join("sidecar.py");

    if !sidecar_script.exists() {
        return Err(format!(
            "No se encontro sidecar.py en {}",
            sidecar_script.display()
        ));
    }

    let mut command = std::process::Command::new(&python_exe);
    command.arg(&sidecar_script).args(args).current_dir(&root_path);
    if let Some((key, value)) = env_var {
        command.env(key, value);
    }

    let output = command
        .output()
        .map_err(|e| format!("Fallo al ejecutar sidecar Python: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Error en sidecar Python: {stderr} {stdout}"));
    }

    Ok(stdout)
}

pub(crate) fn project_root() -> PathBuf {
    let mut dir = std::env::current_dir().unwrap_or_default();
    loop {
        if dir.join("ai").join("sidecar.py").exists() {
            return dir;
        }
        if !dir.pop() {
            break;
        }
    }
    std::env::current_dir().unwrap_or_default()
}

fn python_executable(root_path: &PathBuf) -> String {
    let candidates = [
        root_path.join("ai").join(".venv").join("Scripts").join("python.exe"),
        root_path.join(".venv").join("Scripts").join("python.exe"),
        root_path.join("ai").join(".venv").join("bin").join("python"),
        root_path.join(".venv").join("bin").join("python"),
    ];

    candidates
        .iter()
        .find(|candidate| candidate.exists())
        .map(|candidate| candidate.to_string_lossy().to_string())
        .unwrap_or_else(|| "python".to_string())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_non_chat_model_filtra_embedding() {
        assert!(is_non_chat_model("text-embedding-ada-002"));
        assert!(is_non_chat_model("text-embedding-3-small"));
    }

    #[test]
    fn is_non_chat_model_filtra_whisper() {
        assert!(is_non_chat_model("whisper-1"));
    }

    #[test]
    fn is_non_chat_model_filtra_tts() {
        assert!(is_non_chat_model("tts-1"));
        assert!(is_non_chat_model("tts-1-hd"));
    }

    #[test]
    fn is_non_chat_model_no_filtra_gpt4() {
        assert!(!is_non_chat_model("gpt-4o"));
        assert!(!is_non_chat_model("gpt-4o-mini"));
        assert!(!is_non_chat_model("gpt-4-turbo"));
    }

    #[test]
    fn is_non_chat_model_no_filtra_claude() {
        assert!(!is_non_chat_model("claude-opus-4-6"));
        assert!(!is_non_chat_model("claude-sonnet-4-6"));
    }

    #[test]
    fn is_non_chat_model_no_filtra_modelos_openrouter() {
        assert!(!is_non_chat_model("google/gemini-flash-1.5"));
        assert!(!is_non_chat_model("meta-llama/llama-3-8b-instruct"));
        assert!(!is_non_chat_model("mistralai/mixtral-8x7b"));
    }

    #[test]
    fn model_id_to_display_name_traduce_conocidos() {
        assert_eq!(model_id_to_display_name("gpt-4o"), "GPT-4o");
        assert_eq!(model_id_to_display_name("gpt-4o-mini"), "GPT-4o Mini");
        assert_eq!(model_id_to_display_name("o1"), "o1");
    }

    #[test]
    fn model_id_to_display_name_pasa_desconocidos_sin_cambio() {
        assert_eq!(
            model_id_to_display_name("custom/mi-modelo"),
            "custom/mi-modelo"
        );
    }

    #[test]
    fn anthropic_known_models_retorna_lista_no_vacia() {
        let models = anthropic_known_models();
        assert!(!models.is_empty());
        assert!(models.iter().all(|m| !m.id.is_empty()));
        assert!(models.iter().all(|m| !m.name.is_empty()));
    }

    #[test]
    fn is_non_chat_model_filtra_dalle() {
        assert!(is_non_chat_model("dall-e-3"));
        assert!(is_non_chat_model("dall-e-2"));
    }

    #[test]
    fn is_non_chat_model_filtra_moderation() {
        assert!(is_non_chat_model("text-moderation-stable"));
    }
}
