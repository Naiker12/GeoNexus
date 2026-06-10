use std::time::Instant;

use geonexus_core::chat::{MessageStats, ResearchSource, SendMessageInput, SendMessageResponse, Message, MessageRole};
use geonexus_db::chat_repo;
use serde_json::json;
use tauri::State;
use uuid::Uuid;

use super::context::build_messages;
use super::tools::{execute_tool_call, get_tool_definitions};
use super::{run_sidecar_json, unix_now, AppState};
use crate::commands::llm::run_sidecar;

#[derive(Debug, serde::Deserialize)]
struct RecallChunk {
    text: String,
    source: String,
}

#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    input: SendMessageInput,
) -> Result<SendMessageResponse, String> {
    // 1. Validar y obtener/aplicar conversacion
    input.validate()?;

    let chat_start = Instant::now();
    let trace_id = Uuid::new_v4().to_string();
    let conversation_id = ensure_conversation(&state, &input).await?;

    let user_msg = Message {
        id: Uuid::new_v4().to_string(),
        conversation_id: conversation_id.clone(),
        role: MessageRole::User,
        content: input.content.trim().to_string(),
        provider: None,
        model: None,
        trace_id: trace_id.clone(),
        chunks_used: vec![],
        nodes_used: vec![],
        tool_calls: vec![],
        sources: vec![],
        created_at: unix_now(),
        research_sources: None,
        stats: None,
    };

    chat_repo::insert_message(&state.db, &user_msg).await?;

    if input.conversation_id.is_none() {
        let title = super::title_from_message(&input.content);
        let _ = chat_repo::update_conversation_title(&state.db, &conversation_id, &title).await;
    }

    // 2. RAG context
    let recall_chunks: Vec<RecallChunk> = run_sidecar_json(&[
        "--action",
        "recall_chunks",
        "--query",
        &input.content,
        "--project_id",
        &input.project_id,
        "--top_k",
        "4",
    ])
    .unwrap_or_default();

    let rag_context = if recall_chunks.is_empty() {
        String::new()
    } else {
        let context_text = recall_chunks
            .iter()
            .enumerate()
            .map(|(i, c)| format!("[{}] {}", i + 1, c.text))
            .collect::<Vec<_>>()
            .join("\n\n");
        format!(
            "Contexto relevante del proyecto (documentos indexados):\n{}\n\n\
             Usa este contexto para responder. Cita el numero de fuente cuando uses informacion de el.",
            context_text
        )
    };

    let project_context = run_sidecar_json::<serde_json::Value>(&[
        "--action",
        "build_project_context",
        "--project_id",
        &input.project_id,
    ])
    .ok()
    .and_then(|v| v["context"].as_str().map(String::from))
    .unwrap_or_default();

    // 3. Web search
    let search_query = extract_search_query(&input.content);
    let research_sources: Vec<ResearchSource> = if input.web_search {
        let result = run_sidecar_json::<Vec<ResearchSource>>(&[
            "--action",
            "search_web",
            "--query",
            &search_query,
            "--max_results",
            "5",
        ]);
        match &result {
            Ok(srcs) => eprintln!("[DEBUG] search_web OK: {} sources", srcs.len()),
            Err(e) => eprintln!("[DEBUG] search_web error: {e}"),
        }
        result.unwrap_or_default()
    } else {
        eprintln!("[DEBUG] web_search not enabled");
        vec![]
    };

    let web_context = if research_sources.is_empty() {
        String::new()
    } else {
        let lines: Vec<String> = research_sources
            .iter()
            .enumerate()
            .map(|(i, s)| {
                format!(
                    "[Fuente {}] {} - {}: {}",
                    i + 1,
                    s.title,
                    s.url,
                    s.snippet.as_deref().unwrap_or("")
                )
            })
            .collect();
        lines.join("\n")
    };

    // 4. Tool definitions
    let tools = get_tool_definitions();
    let tools_json = serde_json::to_string(&tools)
        .map_err(|e| format!("Error serializando tools: {e}"))?;

    // 5. Build messages array
    let history = chat_repo::list_messages(&state.db, &conversation_id).await?;
    let mut messages = build_messages(&history, &project_context, &web_context, &rag_context, &input.content);

    // 6. Tool-calling loop
    let max_iter: usize = 10;
    let mut iteration: usize = 0;
    let final_content: String;
    let mut last_sidecar: Option<super::SidecarChatResult> = None;

    loop {
        if iteration >= max_iter {
            return Err(
                "El LLM excedio el maximo de llamadas a herramientas (10)".into(),
            );
        }

        let messages_json = serde_json::to_string(&messages)
            .map_err(|e| format!("Error serializando mensajes: {e}"))?;

        let mut sidecar_args: Vec<String> = vec![
            "--action".into(),
            "chat_llm".into(),
            "--provider_type".into(),
            input.provider.clone(),
            "--base_url".into(),
            input.endpoint.clone(),
            "--model".into(),
            input.model.clone(),
            "--messages".into(),
            messages_json,
            "--tools".into(),
            tools_json.clone(),
        ];
        if let Some(ref key) = input.api_key {
            sidecar_args.push("--api_key".into());
            sidecar_args.push(key.clone());
        }

        let output = run_sidecar(
            &sidecar_args.iter().map(String::as_str).collect::<Vec<_>>()
        )?;

        let sidecar: super::SidecarChatResult = serde_json::from_str(&output)
            .map_err(|e| format!("Error deserializando respuesta LLM: {e}. Output: {output}"))?;

        if sidecar.status != "ok" {
            return Err(sidecar
                .error_message()
                .unwrap_or_else(|| "El proveedor LLM no pudo responder".into()));
        }

        if let Some(tool_calls) = sidecar.tool_calls() {
            messages.push(json!({
                "role": "assistant",
                "content": null,
                "tool_calls": tool_calls,
            }));

            for tc in &tool_calls {
                let tool_call_id = tc["id"]
                    .as_str()
                    .unwrap_or("call_unknown")
                    .to_string();
                let result = execute_tool_call(tc);
                messages.push(json!({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": result,
                }));
            }

            iteration += 1;
            continue;
        }

        final_content = sidecar
            .content()
            .filter(|c| !c.is_empty())
            .ok_or_else(|| "El LLM devolvio una respuesta vacia".to_string())?;
        last_sidecar = Some(sidecar);
        break;
    }

    // 7. Extraer stats del mensaje
    let msg_stats = last_sidecar.as_ref()
        .and_then(|s| extract_message_stats(s, chat_start.elapsed(), &input.model));

    // 8. Guardar mensaje del asistente
    let sources: Vec<String> = recall_chunks
        .iter()
        .map(|c| c.source.clone())
        .collect();

    let assistant_msg = Message {
        id: Uuid::new_v4().to_string(),
        conversation_id: conversation_id.clone(),
        role: MessageRole::Assistant,
        content: final_content,
        provider: Some(input.provider),
        model: Some(input.model),
        trace_id: trace_id.clone(),
        chunks_used: vec![],
        nodes_used: vec![],
        tool_calls: vec![],
        sources,
        created_at: unix_now(),
        research_sources: if research_sources.is_empty() {
            None
        } else {
            Some(research_sources.clone())
        },
        stats: msg_stats,
    };

    chat_repo::insert_message(&state.db, &assistant_msg).await?;

    Ok(SendMessageResponse {
        conversation_id,
        message: assistant_msg,
        chunks_used: Vec::new(),
        trace_id,
        research_sources,
        search_query,
    })
}

async fn ensure_conversation(
    state: &State<'_, AppState>,
    input: &SendMessageInput,
) -> Result<String, String> {
    if let Some(id) = input.conversation_id.as_ref().filter(|id| !id.trim().is_empty()) {
        return Ok(id.clone());
    }

    let conversation = chat_repo::create_conversation(
        &state.db,
        &input.project_id,
        input.workspace_id.as_deref(),
        &input.provider,
        &input.model,
    )
    .await?;

    Ok(conversation.id)
}

fn extract_message_stats(
    result: &super::SidecarChatResult,
    elapsed: std::time::Duration,
    model: &str,
) -> Option<MessageStats> {
    let usage = result.usage.as_ref()?;

    let input_tokens = usage.get("prompt_tokens")
        .and_then(|v| v.as_u64()).unwrap_or(0) as u32;
    let output_tokens = usage.get("completion_tokens")
        .and_then(|v| v.as_u64()).unwrap_or(0) as u32;
    let total_tokens = input_tokens + output_tokens;

    let duration_ms = elapsed.as_millis() as u64;
    let duration_secs = elapsed.as_secs_f32();
    let tokens_per_second = if duration_secs > 0.0 {
        output_tokens as f32 / duration_secs
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

fn extract_search_query(user_message: &str) -> String {
    let msg = user_message.trim();
    if msg.len() < 60 {
        return msg.to_string();
    }
    let filler_prefixes = [
        "dime ", "cuéntame ", "explícame ", "qué es ", "qué son ",
        "cómo ", "cuál es ", "dame información sobre ",
        "busca información sobre ", "necesito saber ",
        "puedes decirme ", "me puedes explicar ",
    ];
    let mut clean = msg.to_lowercase();
    for prefix in &filler_prefixes {
        if clean.starts_with(prefix) {
            clean = clean[prefix.len()..].to_string();
            break;
        }
    }
    let query = if clean.len() > 80 {
        let cut = &clean[..80];
        match cut.rfind(' ') {
            Some(pos) => clean[..pos].to_string(),
            None => cut.to_string(),
        }
    } else {
        clean
    };
    let mut chars = query.chars();
    match chars.next() {
        None => String::new(),
        Some(c) => c.to_uppercase().to_string() + chars.as_str(),
    }
}
