use geonexus_core::chat::MessageStats;

/// Extrae estadísticas de uso de la respuesta del sidecar LLM.
pub fn extract_message_stats(
    result: &super::SidecarChatResult,
    elapsed: std::time::Duration,
    model: &str,
) -> Option<MessageStats> {
    let usage = result.usage.as_ref()?;

    let input_tokens = usage
        .get("prompt_tokens")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    let output_tokens = usage
        .get("completion_tokens")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    let total_tokens = input_tokens + output_tokens;

    let duration_ms = elapsed.as_millis() as u64;
    let duration_secs = elapsed.as_secs_f64();
    let tokens_per_second = if duration_secs > 0.0 {
        output_tokens as f32 / duration_secs as f32
    } else {
        0.0
    };

    let context_window = model_context_window(model);
    let context_used_pct = if context_window > 0 {
        (input_tokens as f32 / context_window as f32) * 100.0
    } else {
        0.0
    };

    Some(MessageStats {
        input_tokens,
        output_tokens,
        total_tokens,
        duration_ms,
        tokens_per_second,
        cost_usd: 0.0,
        context_window,
        context_used_pct,
    })
}

/// Retorna la ventana de contexto conocida para un modelo dado.
fn model_context_window(model: &str) -> u32 {
    if model.contains("gpt-4o") {
        128_000
    } else if model.contains("claude") {
        200_000
    } else if model.contains("gemini-1.5") {
        1_000_000
    } else if model.contains("gemini-2.0") {
        1_000_000
    } else if model.contains("nemotron") {
        128_000
    } else if model.contains("llama-3.1-70b") {
        131_072
    } else if model.contains("llama-3.1") || model.contains("llama3.1") {
        131_072
    } else if model.contains("llama-3") || model.contains("llama3") {
        8_192
    } else if model.contains("mistral") || model.contains("mixtral") {
        32_768
    } else if model.contains("deepseek") {
        128_000
    } else if model.contains("qwen") {
        131_072
    } else if model.contains("phi-3") || model.contains("phi3") {
        128_000
    } else if model.contains("command-r") || model.contains("command-r7") {
        128_000
    } else {
        128_000
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_model_context_window() {
        assert_eq!(model_context_window("gpt-4o"), 128_000);
        assert_eq!(model_context_window("claude-3-opus"), 200_000);
        assert_eq!(model_context_window("gemini-1.5-pro"), 1_000_000);
        assert_eq!(model_context_window("deepseek-v2"), 128_000);
        assert_eq!(model_context_window("llama3.1-70b"), 131_072);
        assert_eq!(model_context_window("mistral-large"), 32_768);
        assert_eq!(model_context_window("unknown-model"), 128_000);
    }
}
