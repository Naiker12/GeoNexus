use serde::Deserialize;
use crate::commands::llm::LlmModelInfo;

pub async fn fetch_ollama_models(base: &str) -> Result<Vec<LlmModelInfo>, String> {
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

pub async fn fetch_openai_compat_models(
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

pub async fn fetch_openrouter_models(api_key: &str) -> Result<Vec<LlmModelInfo>, String> {
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

pub async fn fetch_openai_models(api_key: &str) -> Result<Vec<LlmModelInfo>, String> {
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

pub fn anthropic_known_models() -> Vec<LlmModelInfo> {
    vec![
        LlmModelInfo { id: "claude-opus-4-6".into(),   name: "Claude Opus 4.6".into(),   context_length: Some(200_000), is_free: Some(false) },
        LlmModelInfo { id: "claude-sonnet-4-6".into(), name: "Claude Sonnet 4.6".into(), context_length: Some(200_000), is_free: Some(false) },
        LlmModelInfo { id: "claude-haiku-4-5-20251001".into(), name: "Claude Haiku 4.5".into(), context_length: Some(200_000), is_free: Some(false) },
    ]
}

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

pub fn is_non_chat_model(id: &str) -> bool {
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

pub fn model_id_to_display_name(id: &str) -> String {
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
