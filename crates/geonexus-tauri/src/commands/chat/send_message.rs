use std::time::Instant;

use geonexus_core::chat::{
    Message, MessageRole, ResearchSource, SendMessageInput, SendMessageResponse,
};
use geonexus_core::reasoning::QueryIntent;
use geonexus_db::chat_repo;
use serde_json::json;
use tauri::State;
use uuid::Uuid;

use super::classifier::classify_intent;
use super::context::{build_graph_context, ContextEdge};
use super::messages::build_messages;
use super::search::extract_search_query;
use super::stats::extract_message_stats;
use super::tools::{execute_tool_call, get_tool_definitions};
use super::validator::validate_response;
use super::{run_sidecar_json, unix_now, AppState, ContextNode};
use crate::commands::llm::run_sidecar;

#[derive(Debug, serde::Deserialize)]
struct RecallChunk {
    text: String,
    source: String,
}

#[derive(Debug, sqlx::FromRow)]
struct EdgeRow {
    source_label: String,
    target_label: String,
    relation: String,
}

#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    input: SendMessageInput,
) -> Result<SendMessageResponse, String> {
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

    // === Intent Classification ===
    let intent = classify_intent(&input.content);
    let intent_label = intent.label().to_string();

    // === Graph nodes + edges for enhanced context ===
    let graph_nodes: Vec<ContextNode> = sqlx::query_as::<_, ContextNode>(
        "SELECT name AS label, kind FROM graph_nodes WHERE project_id = ? LIMIT 8",
    )
    .bind(&input.project_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let graph_edges: Vec<ContextEdge> = sqlx::query_as::<_, EdgeRow>(
        "SELECT sn.name AS source_label, tn.name AS target_label, e.relation
         FROM graph_edges e
         JOIN graph_nodes sn ON e.source = sn.id
         JOIN graph_nodes tn ON e.target = tn.id
         WHERE e.project_id = ?
         LIMIT 20",
    )
    .bind(&input.project_id)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|r| ContextEdge {
        source_label: r.source_label,
        target_label: r.target_label,
        relation: r.relation,
    })
    .collect();

    let graph_context = build_graph_context(&graph_nodes, &graph_edges, &intent);

    // === RAG context ===
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

    let all_project_context = if graph_context.is_empty() {
        project_context.clone()
    } else if project_context.is_empty() {
        graph_context.clone()
    } else {
        format!("{}\n\n{}", project_context, graph_context)
    };

    // === Web search ===
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

    // === Tool definitions ===
    let tools = get_tool_definitions();
    let tools_json = serde_json::to_string(&tools)
        .map_err(|e| format!("Error serializando tools: {e}"))?;

    // === Build messages array ===
    let history = chat_repo::list_messages(&state.db, &conversation_id).await?;
    let mut messages =
        build_messages(&history, &all_project_context, &web_context, &rag_context, &input.content);

    // === Tool-calling loop ===
    const MAX_ITER: usize = 10;
    let mut iteration: usize = 0;
    let (final_content, last_sidecar) = loop {
        if iteration >= MAX_ITER {
            return Err(
                "El modelo excedio el maximo de llamadas a herramientas (10)".into(),
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
            &sidecar_args.iter().map(String::as_str).collect::<Vec<_>>(),
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

        let content = sidecar
            .content()
            .filter(|c| !c.is_empty())
            .ok_or_else(|| "El LLM devolvio una respuesta vacia".to_string())?;

        break (content, Some(sidecar));
    };

    let response_model = last_sidecar
        .as_ref()
        .and_then(|s| s.model.as_deref())
        .filter(|m| !m.is_empty())
        .map(String::from)
        .unwrap_or_else(|| input.model.clone());

    // === Response Validation ===
    let validation = validate_response(&final_content, &graph_nodes, &[]);
    let validation_warnings: Vec<String> = if validation.passed {
        vec![]
    } else {
        validation.warnings
    };

    // === Episodic Memory (save analysis session for non-general intents) ===
    if intent != QueryIntent::ConsultaGeneral {
        let session_id = Uuid::new_v4().to_string();
        let tool_names: Vec<String> = messages
            .iter()
            .filter(|m| m["role"] == "tool")
            .map(|m| m["content"].as_str().unwrap_or("").to_string())
            .collect();
        let _ = sqlx::query(
            "INSERT INTO analysis_sessions (id, project_id, workspace_id, title, objective, intent, datasets_used, nodes_consulted, tools_executed, key_findings, deliverables, conversation_id, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&session_id)
        .bind(&input.project_id)
        .bind(&input.workspace_id)
        .bind(&intent_label)
        .bind(&input.content)
        .bind(&intent_label)
        .bind("[]")
        .bind(
            &serde_json::to_string(
                &graph_nodes.iter().map(|n| &n.label).collect::<Vec<&String>>(),
            )
            .unwrap_or_default(),
        )
        .bind(&serde_json::to_string(&tool_names).unwrap_or_default())
        .bind(&final_content)
        .bind::<Option<String>>(None)
        .bind(&conversation_id)
        .bind(unix_now())
        .execute(&state.db)
        .await;
    }

    // === Stats ===
    let msg_stats = last_sidecar
        .as_ref()
        .and_then(|s| extract_message_stats(s, chat_start.elapsed(), &response_model));

    // === Save assistant message ===
    let sources: Vec<String> = recall_chunks.iter().map(|c| c.source.clone()).collect();

    let assistant_msg = Message {
        id: Uuid::new_v4().to_string(),
        conversation_id: conversation_id.clone(),
        role: MessageRole::Assistant,
        content: final_content,
        provider: Some(input.provider),
        model: Some(response_model),
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
        validation_warnings,
        intent: Some(intent_label),
    })
}

async fn ensure_conversation(
    state: &State<'_, AppState>,
    input: &SendMessageInput,
) -> Result<String, String> {
    if let Some(id) = input
        .conversation_id
        .as_ref()
        .filter(|id| !id.trim().is_empty())
    {
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
