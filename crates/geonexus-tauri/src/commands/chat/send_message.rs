use std::time::Instant;

use geonexus_core::chat::{
    ChunkReference, Message, MessageRole, ReasoningStepEvent, ResearchSource,
    SendMessageInput, SendMessageResponse, SessionSummary,
};
use geonexus_core::reasoning::QueryIntent;
use geonexus_core::{GraphUpdatePayload, GraphEdge};
use geonexus_db::chat_repo;
use serde_json::json;
use tauri::State;
use tauri::Emitter;
use uuid::Uuid;

use super::classifier::classify_intent;
use super::context::{build_graph_context, ContextEdge};
use super::messages::build_messages;
use super::search::extract_search_query;
use super::stats::extract_message_stats;
use super::tools::{execute_tool_call, get_tool_definitions};
use super::validator::validate_response;
use super::{run_sidecar_json, unix_now, AppState, ContextNode, RecallChunk};
use crate::commands::llm::run_sidecar_streaming;
use crate::commands::graph_events::emit_graph_update;

fn emit_reasoning_step(handle: Option<&tauri::AppHandle>, event: &ReasoningStepEvent) {
    if let Some(h) = handle {
        let _ = h.emit("reasoning:step", event);
    }
}

fn emit_reasoning_done(handle: Option<&tauri::AppHandle>, summary: &SessionSummary) {
    if let Some(h) = handle {
        let _ = h.emit("reasoning:done", summary);
    }
}

fn emit_tool_call(handle: Option<&tauri::AppHandle>, tool_name: &str, tool_call_id: &str, args: &serde_json::Value) {
    if let Some(h) = handle {
        let _ = h.emit("llm:tool_call", json!({
            "tool_name": tool_name,
            "tool_call_id": tool_call_id,
            "args": args,
        }));
    }
}

fn emit_tool_result(handle: Option<&tauri::AppHandle>, tool_name: &str, success: bool, duration_ms: u64) {
    if let Some(h) = handle {
        let _ = h.emit("llm:tool_result", json!({
            "tool_name": tool_name,
            "success": success,
            "duration_ms": duration_ms,
        }));
    }
}

fn emit_llm_done(handle: Option<&tauri::AppHandle>, content_len: usize, model: &str) {
    if let Some(h) = handle {
        let _ = h.emit("llm:done", json!({
            "content_length": content_len,
            "model": model,
        }));
    }
}

fn emit_stream_event(handle: Option<&tauri::AppHandle>, event: &serde_json::Value) {
    if let Some(h) = handle {
        let _ = h.emit("chat:stream_event", event);
    }
}

fn emit_preview_chunk(handle: Option<&tauri::AppHandle>, chunk: &serde_json::Value) {
    if let Some(h) = handle {
        let _ = h.emit("chat:preview_chunk", chunk);
    }
}

fn stream_event_id() -> String {
    let uuid = Uuid::new_v4().to_string();
    uuid[..8].to_string()
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

    // === Intent Classification ===
    let intent = classify_intent(&input.content);
    let intent_label = intent.label().to_string();
    let _ = emit_reasoning_step(state.app_handle.as_ref(), &ReasoningStepEvent::IntentClassified {
        intent: intent_label.clone(),
        confidence: 0.85,
        detected_entities: vec![],
    });

    // === Graph nodes + edges for enhanced context ===
    let graph_nodes: Vec<ContextNode> = sqlx::query_as::<_, ContextNode>(
        "SELECT id, name AS label, kind FROM graph_nodes WHERE project_id = ? LIMIT 8",
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

    let (graph_context, graph_node_ids) = build_graph_context(&graph_nodes, &graph_edges, &intent);

    if !graph_node_ids.is_empty() {
        let _ = emit_reasoning_step(state.app_handle.as_ref(), &ReasoningStepEvent::GraphContextLoaded {
            nodes_count: graph_node_ids.len(),
            edges_count: graph_edges.len(),
        });
    }

    let user_msg = Message {
        id: Uuid::new_v4().to_string(),
        conversation_id: conversation_id.clone(),
        role: MessageRole::User,
        content: input.content.trim().to_string(),
        provider: None,
        model: None,
        trace_id: trace_id.clone(),
        chunks_used: vec![],
        nodes_used: graph_node_ids.clone(),
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

    // === RAG context ===
    let mentioned_asset_ids_str = if input.mentioned_asset_ids.is_empty() && input.mentioned_connector_ids.is_empty() {
        String::new()
    } else {
        let all: Vec<&str> = input.mentioned_asset_ids.iter().map(String::as_str)
            .chain(input.mentioned_connector_ids.iter().map(String::as_str))
            .collect();
        all.join(",")
    };
    let recall_chunks: Vec<RecallChunk> = {
        let mut args = vec![
            "--action", "recall_chunks",
            "--query", &input.content,
            "--project_id", &input.project_id,
            "--top_k", "4",
        ];
        if !mentioned_asset_ids_str.is_empty() {
            args.push("--asset_ids");
            args.push(&mentioned_asset_ids_str);
        }
        run_sidecar_json(&args).unwrap_or_default()
    };

    // Build chunk references for citations
    let chunks_used: Vec<ChunkReference> = {
        if recall_chunks.is_empty() {
            Vec::new()
        } else {
            let asset_ids: Vec<&str> = recall_chunks.iter().map(|c| c.asset_id.as_str()).collect();
            let mut name_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
            if !asset_ids.is_empty() {
                let placeholders: Vec<String> = asset_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 1)).collect();
                let sql = format!(
                    "SELECT DISTINCT id, name FROM assets WHERE id IN ({})",
                    placeholders.join(",")
                );
                // Build a raw query with positional bindings
                let mut q = sqlx::query(&sql);
                for aid in &asset_ids {
                    q = q.bind(aid);
                }
                if let Ok(rows) = q.fetch_all(&state.db).await {
                    for row in rows {
                        use sqlx::Row;
                        let id: String = row.get("id");
                        let name: String = row.get("name");
                        name_map.insert(id, name);
                    }
                }
            }

            recall_chunks
                .iter()
                .map(|c| {
                    let asset_name = name_map.get(&c.asset_id).cloned().unwrap_or_else(|| c.source.clone());
                    let text_preview = if c.text.len() > 200 {
                        format!("{}...", &c.text[..200])
                    } else {
                        c.text.clone()
                    };
                    ChunkReference {
                        chunk_id: c.chunk_id.clone(),
                        asset_id: c.asset_id.clone(),
                        asset_name,
                        chunk_index: c.chunk_index,
                        relevance_score: c.score,
                        text_preview,
                    }
                })
                .collect()
        }
    };

    let rag_context = if recall_chunks.is_empty() {
        String::new()
    } else {
        let rag_event_id = format!("rag-{}", stream_event_id());
        let context_text = recall_chunks
            .iter()
            .enumerate()
            .map(|(i, c)| format!("[{}] {}", i + 1, c.text))
            .collect::<Vec<_>>()
            .join("\n\n");
        let top_relevance = chunks_used.iter().map(|c| c.relevance_score).fold(0.0_f32, f32::max);
        let assets_queried: Vec<String> = chunks_used.iter().map(|c| c.asset_name.clone()).collect();
        let _ = emit_reasoning_step(state.app_handle.as_ref(), &ReasoningStepEvent::KnowledgeRetrieved {
            chunks_found: recall_chunks.len(),
            assets_queried,
            top_relevance,
        });
        let _ = emit_stream_event(state.app_handle.as_ref(), &json!({
            "type": "knowledge_lookup",
            "event_id": rag_event_id,
            "conversation_id": conversation_id,
            "status": "complete",
            "docs_count": recall_chunks.len(),
        }));
        for chunk in &recall_chunks {
            let _ = emit_preview_chunk(state.app_handle.as_ref(), &json!({
                "event_id": rag_event_id,
                "chunk_type": "rag_doc",
                "content": chunk.text,
                "source": chunk.asset_id,
                "score": chunk.score,
            }));
        }
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

    // === Mention context (sources the user explicitly attached via @) ===
    let mention_context = {
        let mut parts: Vec<String> = Vec::new();

        if !input.mentioned_connector_ids.is_empty() {
            for cid in &input.mentioned_connector_ids {
                let name: Option<String> = sqlx::query_scalar(
                    "SELECT display_name FROM connector_configs WHERE id = ? AND project_id = ?"
                )
                .bind(cid)
                .bind(&input.project_id)
                .fetch_optional(&state.db)
                .await
                .unwrap_or(None);
                if let Some(n) = name {
                    parts.push(format!(
                        "[CONTEXTO ADJUNTO: Conector \"{}\" — usar sus documentos como fuente prioritaria]",
                        n
                    ));
                }
            }
        }

        if !input.mentioned_asset_ids.is_empty() {
            for aid in &input.mentioned_asset_ids {
                let name: Option<String> = sqlx::query_scalar(
                    "SELECT name FROM assets WHERE id = ? AND project_id = ?"
                )
                .bind(aid)
                .bind(&input.project_id)
                .fetch_optional(&state.db)
                .await
                .unwrap_or(None);
                if let Some(n) = name {
                    parts.push(format!(
                        "[CONTEXTO ADJUNTO: Documento \"{}\" — buscar información en este documento primero]",
                        n
                    ));
                }
            }
        }

        if !input.mentioned_node_ids.is_empty() {
            for nid in &input.mentioned_node_ids {
                let name: Option<String> = sqlx::query_scalar(
                    "SELECT name FROM graph_nodes WHERE id = ? AND project_id = ?"
                )
                .bind(nid)
                .bind(&input.project_id)
                .fetch_optional(&state.db)
                .await
                .unwrap_or(None);
                if let Some(n) = name {
                    parts.push(format!(
                        "[CONTEXTO ADJUNTO: Nodo del grafo \"{}\" — incluir su evidencia y conexiones]",
                        n
                    ));
                }
            }
        }

        if parts.is_empty() { String::new() } else { parts.join("\n") }
    };

    let all_project_context = {
        let mut parts: Vec<String> = Vec::new();
        if !project_context.is_empty() { parts.push(project_context.clone()); }
        if !graph_context.is_empty() { parts.push(graph_context.clone()); }
        if !mention_context.is_empty() { parts.push(mention_context.clone()); }
        parts.join("\n\n")
    };

    // === Web search ===
    let search_query = extract_search_query(&input.content);
    let web_event_id = format!("deep-{}", stream_event_id());
    let research_sources: Vec<ResearchSource> = if input.web_search {
        emit_stream_event(state.app_handle.as_ref(), &json!({
            "type": "deep_research",
            "event_id": web_event_id,
            "conversation_id": conversation_id,
            "status": "searching",
            "display_query": search_query,
        }));
        let result = run_sidecar_json::<Vec<ResearchSource>>(&[
            "--action",
            "search_web",
            "--query",
            &search_query,
            "--max_results",
            "5",
        ]);
        match &result {
            Ok(srcs) => {
                let _ = emit_reasoning_step(state.app_handle.as_ref(), &ReasoningStepEvent::WebSearching {
                    query: search_query.clone(),
                    sources_found: srcs.len(),
                });
                emit_stream_event(state.app_handle.as_ref(), &json!({
                    "type": "deep_research",
                    "event_id": web_event_id,
                    "conversation_id": conversation_id,
                    "status": "complete",
                    "display_query": search_query,
                    "sources_count": srcs.len(),
                    "sources": srcs.iter().map(|s| json!({
                        "title": s.title,
                        "url": s.url,
                        "domain": s.url.replace("https://", "").replace("http://", "").split('/').next().unwrap_or(""),
                        "snippet": s.snippet,
                    })).collect::<Vec<_>>(),
                }));
                for src in srcs {
                    let _ = emit_preview_chunk(state.app_handle.as_ref(), &json!({
                        "event_id": web_event_id,
                        "chunk_type": "source",
                        "content": src.title,
                        "title": src.title,
                        "url": src.url,
                        "snippet": src.snippet,
                    }));
                }
                eprintln!("[DEBUG] search_web OK: {} sources", srcs.len());
            },
            Err(e) => {
                let _ = emit_stream_event(state.app_handle.as_ref(), &json!({
                    "type": "deep_research",
                    "event_id": web_event_id,
                    "conversation_id": conversation_id,
                    "status": "error",
                }));
                eprintln!("[DEBUG] search_web error: {e}");
            }
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

    // === Skills context ===
    let skills_context = {
        let mut contents: Vec<String> = Vec::new();
        for skill_name in &input.skill_names {
            if let Ok(content) = geonexus_db::skills::registry::read_skill_md(&state.db, skill_name).await {
                contents.push(content);
            }
        }
        if !contents.is_empty() {
            let total_tokens: usize = contents.iter().map(|c| c.len() / 4).sum();
            let _ = emit_reasoning_step(state.app_handle.as_ref(), &ReasoningStepEvent::SkillsInjected {
                skill_names: input.skill_names.clone(),
                total_tokens,
            });
        }
        if contents.is_empty() {
            String::new()
        } else {
            format!(
                "## Skills activos\n\nSigue las instrucciones de estos skills:\n\n{}",
                contents.join("\n\n---\n\n")
            )
        }
    };

    // Record activation for each skill used
    if !input.skill_names.is_empty() {
        let now = unix_now();
        for skill_name in &input.skill_names {
            let _ = geonexus_db::skills::registry::record_activation(
                &state.db,
                skill_name,
                input.conversation_id.as_deref(),
                Some("chat"),
                now,
            ).await;
        }
    }

    // === Build messages array ===
    let history = chat_repo::list_messages(&state.db, &conversation_id).await?;
    let asset_count = chunks_used.iter().map(|c| &c.asset_id).collect::<std::collections::HashSet<_>>().len();
    let mut messages =
        build_messages(&history, &all_project_context, &web_context, &rag_context, &skills_context, &input.content, &input.skill_names, asset_count);

    // === Tool-calling loop ===
    const MAX_ITER: usize = 10;
    let mut iteration: usize = 0;
    let (final_content, last_sidecar) = loop {
        if iteration >= MAX_ITER {
            return Err(
                "El modelo excedio el maximo de llamadas a herramientas (10)".into(),
            );
        }

        let estimated_input_tokens = serde_json::to_string(&messages)
            .map(|s| s.len() / 4)
            .unwrap_or(0);
        let _ = emit_reasoning_step(state.app_handle.as_ref(), &ReasoningStepEvent::GeneratingResponse {
            model: input.model.clone(),
            provider: input.provider.clone(),
            estimated_tokens: Some(estimated_input_tokens),
        });

        let gen_event_id = format!("gen-{}", stream_event_id());
        let _ = emit_stream_event(state.app_handle.as_ref(), &json!({
            "type": "generating",
            "event_id": gen_event_id,
            "conversation_id": conversation_id,
            "status": "running",
        }));

        let mut sidecar_args: Vec<String> = vec![
            "--action".into(),
            "chat_llm_stream".into(),
            "--provider_type".into(),
            input.provider.clone(),
            "--base_url".into(),
            input.endpoint.clone(),
            "--model".into(),
            input.model.clone(),
        ];

        // Pasar JSON grande via archivos temporales para evitar
        // error 206 en Windows (límite de ~8191 chars en cmd line)
        let messages_json = serde_json::to_string(&messages)
            .map_err(|e| format!("Error serializando mensajes: {e}"))?;
        let msgs_file = std::env::temp_dir().join(format!("geonexus_msgs_{}.json", Uuid::new_v4()));
        std::fs::write(&msgs_file, &messages_json)
            .map_err(|e| format!("Error escribiendo archivo temporal de mensajes: {e}"))?;
        sidecar_args.push("--messages_file".into());
        sidecar_args.push(msgs_file.to_string_lossy().to_string());

        let tools_file = std::env::temp_dir().join(format!("geonexus_tools_{}.json", Uuid::new_v4()));
        std::fs::write(&tools_file, &tools_json)
            .map_err(|e| format!("Error escribiendo archivo temporal de tools: {e}"))?;
        sidecar_args.push("--tools_file".into());
        sidecar_args.push(tools_file.to_string_lossy().to_string());

        if let Some(ref key) = input.api_key {
            sidecar_args.push("--api_key".into());
            sidecar_args.push(key.clone());
        }

        let output = run_sidecar_streaming(
            &sidecar_args.iter().map(String::as_str).collect::<Vec<_>>(),
            state.app_handle.as_ref(),
            Some(&gen_event_id),
        );

        // Limpiar archivos temporales
        let _ = std::fs::remove_file(&msgs_file);
        let _ = std::fs::remove_file(&tools_file);

        let output = output?;

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
                let tool_event_id = format!("tool-{}", stream_event_id());
                let tool_call_id = tc["id"]
                    .as_str()
                    .unwrap_or("call_unknown")
                    .to_string();
                let tool_name = tc.get("function")
                    .and_then(|f| f.get("name"))
                    .and_then(|n| n.as_str())
                    .unwrap_or("unknown");
                let tool_args = tc.get("function")
                    .and_then(|f| f.get("arguments"))
                    .cloned()
                    .unwrap_or(json!(null));

                let display_name = match tool_name {
                    "read_file" => "Leer archivo",
                    "list_directory" => "Listar directorio",
                    "search_code" => "Buscar en código",
                    "glob_files" => "Glob de archivos",
                    _ => tool_name,
                };
                let subtitle: Option<String> = tc.get("function")
                    .and_then(|f| f.get("arguments"))
                    .and_then(|a| a.as_str())
                    .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
                    .and_then(|v| {
                        v.get("path")
                            .or_else(|| v.get("pattern"))
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string())
                    });

                let _ = emit_stream_event(state.app_handle.as_ref(), &json!({
                    "type": "tool_call",
                    "event_id": tool_event_id,
                    "conversation_id": conversation_id,
                    "status": "running",
                    "tool_name": tool_name,
                    "display_name": display_name,
                    "subtitle": subtitle,
                }));

                emit_tool_call(state.app_handle.as_ref(), tool_name, &tool_call_id, &tool_args);

                let t_start = Instant::now();
                let result = execute_tool_call(tc);
                let t_dur = t_start.elapsed().as_millis() as u64;

                // Emit tool_call complete
                let lines_read = if tool_name == "read_file" {
                    result.lines().count()
                } else {
                    0
                };
                let _ = emit_stream_event(state.app_handle.as_ref(), &json!({
                    "type": "tool_call",
                    "event_id": tool_event_id,
                    "conversation_id": conversation_id,
                    "status": "complete",
                    "tool_name": tool_name,
                    "display_name": display_name,
                    "subtitle": subtitle,
                    "lines_read": lines_read,
                }));

                emit_tool_result(state.app_handle.as_ref(), tool_name, true, t_dur);

                let _ = emit_reasoning_step(state.app_handle.as_ref(), &ReasoningStepEvent::McpToolCalled {
                    server_id: "filesystem".into(),
                    tool_name: tool_name.to_string(),
                    success: true,
                    duration_ms: t_dur,
                });
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

        let _ = emit_stream_event(state.app_handle.as_ref(), &json!({
            "type": "generating",
            "event_id": gen_event_id,
            "conversation_id": conversation_id,
            "status": "complete",
        }));
        emit_llm_done(state.app_handle.as_ref(), content.len(), &input.model);
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
        content: final_content.clone(),
        provider: Some(input.provider),
        model: Some(response_model),
        trace_id: trace_id.clone(),
        chunks_used: vec![],
        nodes_used: graph_node_ids,
        tool_calls: vec![],
        sources,
        created_at: unix_now(),
        research_sources: if research_sources.is_empty() {
            None
        } else {
            Some(research_sources.clone())
        },
        stats: msg_stats.clone(),
    };

    chat_repo::insert_message(&state.db, &assistant_msg).await?;

    // === Extract entities from chat into graph nodes + emit graph:updated ===
    let chat_text = format!("{}\n\n{}", input.content, final_content);
    let mut extracted_nodes: Vec<geonexus_core::GraphNode> = Vec::new();
    let mut extracted_edges: Vec<GraphEdge> = Vec::new();

    if let Ok(extracted) = run_sidecar_json::<serde_json::Value>(&[
        "--action",
        "extract_chat_entities",
        "--query",
        &chat_text,
        "--project_id",
        &input.project_id,
        "--workspace_id",
        input.workspace_id.as_deref().unwrap_or("workspace-default"),
    ]) {
        let now = unix_now();
        if let Some(nodes) = extracted["nodes"].as_array() {
            for n in nodes {
                let gn = geonexus_core::GraphNode {
                    id: n["id"].as_str().unwrap_or("").into(),
                    project_id: input.project_id.clone(),
                    workspace_id: input.workspace_id.clone(),
                    name: n["name"].as_str().unwrap_or("").into(),
                    kind: n["kind"].as_str().unwrap_or("concepto").into(),
                    description: n["description"].as_str().unwrap_or("").into(),
                    evidence: n["evidence"].as_str().unwrap_or("chat").into(),
                    x: n["x"].as_f64().unwrap_or(50.0),
                    y: n["y"].as_f64().unwrap_or(50.0),
                    weight: n["weight"].as_i64().unwrap_or(1),
                    created_at: now,
                    source_event: "chat".into(),
                    event_id: conversation_id.clone(),
                    icon: "".into(),
                    is_ephemeral: true,
                    source_asset_id: None,
                    source_chat_id: Some(conversation_id.clone()),
                    origin_kind: "chat".into(),
                    pinned: false,
                    deleted_at: None,
                };
                extracted_nodes.push(gn.clone());
            }
            if !extracted_nodes.is_empty() {
                let _ = state.repo.insert_graph_nodes(&extracted_nodes).await;
            }
        }
        if let Some(edges) = extracted["edges"].as_array() {
            for e in edges {
                let ge = GraphEdge {
                    id: e["id"].as_str().unwrap_or("").into(),
                    project_id: input.project_id.clone(),
                    source: e["source"].as_str().unwrap_or("").into(),
                    target: e["target"].as_str().unwrap_or("").into(),
                    relation: e["relation"].as_str().unwrap_or("asociado con").into(),
                    strength: e["strength"].as_i64().unwrap_or(50),
                    created_at: now,
                };
                extracted_edges.push(ge);
            }
            if !extracted_edges.is_empty() {
                let _ = state.repo.insert_graph_edges(&extracted_edges).await;
            }
        }

        // Emit graph:updated event (only if extraction succeeded)
        if let Some(ref handle) = state.app_handle {
            let now_ts = now;

            // Create web_search nodes from research_sources
            let mut web_nodes: Vec<geonexus_core::GraphNode> = Vec::new();
            let mut web_edges: Vec<GraphEdge> = Vec::new();
            for src in &research_sources {
                let url_id = format!("web-{}", src.url.replace(|c: char| !c.is_alphanumeric(), "-"));
                web_nodes.push(geonexus_core::GraphNode {
                    id: url_id.clone(),
                    project_id: input.project_id.clone(),
                    workspace_id: input.workspace_id.clone(),
                    name: src.title.clone(),
                    kind: "web_search".into(),
                    description: src.snippet.clone().unwrap_or_default(),
                    evidence: src.url.clone(),
                    x: 50.0,
                    y: 50.0,
                    weight: 1,
                    created_at: now_ts,
                    source_event: "chat".into(),
                    event_id: conversation_id.clone(),
                    icon: "".into(),
                    is_ephemeral: true,
                    source_asset_id: None,
                    source_chat_id: Some(conversation_id.clone()),
                    origin_kind: "chat".into(),
                    pinned: false,
                    deleted_at: None,
                });
                if let Some(first_node) = extracted_nodes.first() {
                    web_edges.push(GraphEdge {
                        id: Uuid::new_v4().to_string(),
                        project_id: input.project_id.clone(),
                        source: first_node.id.clone(),
                        target: url_id.clone(),
                        relation: "busqueda web".into(),
                        strength: 60,
                        created_at: now_ts,
                    });
                }
            }

            let mut all_edges = extracted_edges.clone();
            all_edges.extend(web_edges);

            let all_nodes: Vec<geonexus_core::GraphNode> = extracted_nodes
                .iter()
                .chain(web_nodes.iter())
                .cloned()
                .collect();

            let payload = GraphUpdatePayload {
                source_event: "chat".into(),
                event_id: conversation_id.clone(),
                nodes: all_nodes,
                edges: all_edges,
                timestamp: now_ts,
            };
            emit_graph_update(handle, payload);
        }
    }

    // Build session summary for "vida previa"
    let session_summary = SessionSummary {
        message_count: history.len() + 1,
        skills_in_session: input.skill_names.clone(),
        assets_in_session: chunks_used.iter().map(|c| c.asset_name.clone()).collect(),
        last_topics: vec![],
    };

    let _ = emit_reasoning_done(state.app_handle.as_ref(), &session_summary);

    let total_duration = chat_start.elapsed().as_millis() as u64;
    let steps_executed: Vec<String> = {
        let mut s = vec!["intent_classified".to_string()];
        if !graph_nodes.is_empty() { s.push("graph_context_loaded".to_string()); }
        if !recall_chunks.is_empty() { s.push("knowledge_retrieved".to_string()); }
        if input.web_search { s.push("web_searching".to_string()); }
        if !input.skill_names.is_empty() { s.push("skills_injected".to_string()); }
        s.push("generating_response".to_string());
        s.push("response_complete".to_string());
        s
    };

    let _ = emit_reasoning_step(state.app_handle.as_ref(), &ReasoningStepEvent::ResponseComplete {
        total_duration_ms: total_duration,
        input_tokens: msg_stats.as_ref().map(|s| s.input_tokens as usize).unwrap_or(0),
        output_tokens: msg_stats.as_ref().map(|s| s.output_tokens as usize).unwrap_or(0),
        steps_executed,
    });

    Ok(SendMessageResponse {
        conversation_id,
        message: assistant_msg,
        chunks_used,
        trace_id,
        research_sources,
        search_query,
        validation_warnings,
        intent: Some(intent_label),
        session_summary: Some(session_summary),
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
