use std::collections::HashMap;
use geonexus_core::chat::{ChunkReference, ResearchSource};
use serde_json::json;
use tauri::State;

use super::super::search::extract_search_query;
use super::super::{run_sidecar_json, unix_now, AppState, RecallChunk};
use super::streaming::{emit_stream_event, emit_preview_chunk, stream_event_id};
use super::scan_for_prompt_injection;

use crate::commands::agent_identity::load_identity_context;

pub struct PreparedContext {
    pub recall_chunks: Vec<RecallChunk>,
    pub chunks_used: Vec<ChunkReference>,
    pub research_sources: Vec<ResearchSource>,
    pub search_query: String,
    pub tool_catalog: crate::commands::chat::tools::ToolCatalog,
    pub tools_json: String,
    pub history: Vec<geonexus_core::chat::Message>,
    pub messages: Vec<serde_json::Value>,
}

pub async fn prepare_context(
    state: &State<'_, AppState>,
    input: &geonexus_core::chat::SendMessageInput,
    conversation_id: &str,
    graph_context: &str,
) -> Result<PreparedContext, String> {
    // === Parallel tasks: FTS5 Recall, RAG, Project Context, Mention Context, Web Search ===
    let (fts_recall_result, rag_result, project_context_result, mention_context_result, web_search_result) = tokio::join!(
        // FTS5 Session Recall (no LLM cost)
        async {
            let results = geonexus_db::chat_repo::search_messages_fts(
                &state.db, &input.content, &input.project_id, 5,
            ).await.unwrap_or_default();

            if results.is_empty() {
                (String::new(), Vec::new())
            } else {
                let fts_event_id = format!("fts-{}", stream_event_id());
                let _ = emit_stream_event(state.app_handle.as_ref(), &json!({
                    "type": "knowledge_lookup",
                    "event_id": fts_event_id,
                    "conversation_id": conversation_id,
                    "status": "complete",
                    "docs_count": results.len(),
                    "source": "fts5_session_recall",
                }));

                let context_lines: Vec<String> = results.iter().map(|r| {
                    format!("[{}] ({}) {}", r.role, r.conversation_id, r.snippet)
                }).collect();
                let context = format!(
                    "## Sesiones previas relevantes\n\n{}\n\nUsa este contexto historico si es relevante.",
                    context_lines.join("\n")
                );
                (context, results.iter().map(|r| r.message_id.clone()).collect())
            }
        },
        // RAG recall (ChromaDB)
        async {
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

            let chunks_used: Vec<ChunkReference> = {
                if recall_chunks.is_empty() {
                    Vec::new()
                } else {
                    let asset_ids: Vec<&str> = recall_chunks.iter().map(|c| c.asset_id.as_str()).collect();
                    let mut name_map: HashMap<String, String> = HashMap::new();
                    if !asset_ids.is_empty() {
                        let placeholders: Vec<String> = asset_ids.iter().enumerate().map(|(i, _)| format!("?{}", i + 1)).collect();
                        let sql = format!(
                            "SELECT DISTINCT id, name FROM assets WHERE id IN ({})",
                            placeholders.join(",")
                        );
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
                let suspicious_chunks: Vec<_> = recall_chunks
                    .iter()
                    .filter(|c| scan_for_prompt_injection(&c.text))
                    .collect();

                if !suspicious_chunks.is_empty() {
                    tracing::warn!("[security] Found {} suspicious RAG chunks with potential prompt injection patterns", suspicious_chunks.len());
                }
                let rag_event_id = format!("rag-{}", stream_event_id());
                let context_text = recall_chunks
                    .iter()
                    .enumerate()
                    .map(|(i, c)| format!("[{}] {}", i + 1, c.text))
                    .collect::<Vec<_>>()
                    .join("\n\n");
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

            (recall_chunks, chunks_used, rag_context)
        },
        // Project context
        async {
            run_sidecar_json::<serde_json::Value>(&[
                "--action", "build_project_context",
                "--project_id", &input.project_id,
            ])
            .ok()
            .and_then(|v| v["context"].as_str().map(String::from))
            .unwrap_or_default()
        },
        // Mention context
        async {
            let mut parts: Vec<String> = Vec::new();

            let (connector_names, mcp_servers, asset_names, node_names) = tokio::join!(
                async {
                    let mut names = Vec::new();
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
                            names.push(format!(
                                "[CONTEXTO ADJUNTO: Conector \"{}\" — usar sus documentos como fuente prioritaria]",
                                n
                            ));
                        }
                    }
                    names
                },
                async {
                    #[derive(sqlx::FromRow)]
                    struct MentionedMcpServer {
                        name: String,
                        status: String,
                        tools_count: Option<i32>,
                        last_error: Option<String>,
                    }
                    let mut details = Vec::new();
                    for sid in &input.mentioned_mcp_server_ids {
                        let server: Option<MentionedMcpServer> = sqlx::query_as(
                            "SELECT name, status, tools_count, last_error FROM mcp_servers WHERE id = ? AND disabled = 0"
                        )
                        .bind(sid)
                        .fetch_optional(&state.db)
                        .await
                        .unwrap_or(None);

                        if let Some(s) = server {
                            let tools = s.tools_count.unwrap_or(0);
                            let mut detail = format!(
                                "[CONTEXTO ADJUNTO: Servidor MCP \"{}\" — estado {}, {} tools disponibles]",
                                s.name, s.status, tools
                            );
                            if let Some(err) = s.last_error.filter(|e| !e.trim().is_empty()) {
                                detail.push_str(&format!(" Último error: {}", err));
                            }
                            details.push(detail);
                        }
                    }
                    details
                },
                async {
                    let mut names = Vec::new();
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
                            names.push(format!(
                                "[CONTEXTO ADJUNTO: Documento \"{}\" — buscar información en este documento primero]",
                                n
                            ));
                        }
                    }
                    names
                },
                async {
                    let mut names = Vec::new();
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
                            names.push(format!(
                                "[CONTEXTO ADJUNTO: Nodo del grafo \"{}\" — incluir su evidencia y conexiones]",
                                n
                            ));
                        }
                    }
                    names
                }
            );

            parts.extend(connector_names);
            parts.extend(mcp_servers);
            parts.extend(asset_names);
            parts.extend(node_names);

            if parts.is_empty() { String::new() } else { parts.join("\n") }
        },
        // Web search
        async {
            let search_query = extract_search_query(&input.content);
            if input.web_search {
                let web_event_id = format!("deep-{}", stream_event_id());
                emit_stream_event(state.app_handle.as_ref(), &json!({
                    "type": "deep_research",
                    "event_id": web_event_id,
                    "conversation_id": conversation_id,
                    "status": "searching",
                    "display_query": &search_query,
                }));
                let result = run_sidecar_json::<Vec<ResearchSource>>(&[
                    "--action", "search_web",
                    "--query", &search_query,
                    "--max_results", "10",
                    "--search_depth", "standard",
                ]);
                match &result {
                    Ok(srcs) => {
                        emit_stream_event(state.app_handle.as_ref(), &json!({
                            "type": "deep_research",
                            "event_id": web_event_id,
                            "conversation_id": conversation_id,
                            "status": "complete",
                            "display_query": &search_query,
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
                        (srcs.clone(), search_query)
                    },
                    Err(e) => {
                        let _ = emit_stream_event(state.app_handle.as_ref(), &json!({
                            "type": "deep_research",
                            "event_id": web_event_id,
                            "conversation_id": conversation_id,
                            "status": "error",
                        }));
                        eprintln!("[DEBUG] search_web error: {e}");
                        (Vec::new(), search_query)
                    }
                }
            } else {
                eprintln!("[DEBUG] web_search not enabled");
                (Vec::new(), search_query)
            }
        }
    );

    let (fts_context, _fts_ids) = fts_recall_result;
    let (recall_chunks, chunks_used, rag_context) = rag_result;
    let project_context = project_context_result;
    let mention_context = mention_context_result;
    let (research_sources, search_query) = web_search_result;

    let all_project_context = {
        let mut parts: Vec<String> = Vec::new();
        if !project_context.is_empty() { parts.push(project_context.clone()); }
        if !graph_context.is_empty() { parts.push(graph_context.to_string()); }
        if !mention_context.is_empty() { parts.push(mention_context.clone()); }
        if !fts_context.is_empty() { parts.push(fts_context.clone()); }
        parts.join("\n\n")
    };

    let web_context = if research_sources.is_empty() {
        String::new()
    } else {
        let suspicious_sources: Vec<_> = research_sources
            .iter()
            .filter(|s| s.snippet.as_ref().map_or(false, |sn| scan_for_prompt_injection(sn)))
            .collect();

        if !suspicious_sources.is_empty() {
            tracing::warn!("[security] Found {} suspicious web search snippets with potential prompt injection patterns", suspicious_sources.len());
        }

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

    // === Parallel tasks: Tool Catalog, Skills, Identity, History, Workspace ===
    let (tool_catalog_result, skills_context_result, identity_context, history_result, workspace_config_result) = tokio::join!(
        super::super::tools::load_tool_catalog(&state.db),
        async {
            let mut contents: Vec<String> = Vec::new();
            for skill_name in &input.skill_names {
                if let Ok(content) = geonexus_db::skills::registry::read_skill_md(&state.db, skill_name).await {
                    contents.push(content);
                }
            }
            if contents.is_empty() {
                String::new()
            } else {
                format!(
                    "## Skills activos\n\nSigue las instrucciones de estos skills:\n\n{}",
                    contents.join("\n\n---\n\n")
                )
            }
        },
        async { load_identity_context(state) },
        geonexus_db::chat_repo::list_messages(&state.db, conversation_id),
        super::super::get_workspace_config(state.clone())
    );

    let tool_catalog = tool_catalog_result;
    let tools_json = serde_json::to_string(&tool_catalog.definitions)
        .map_err(|e| format!("Error serializando tools: {e}"))?;

    let skills_context = skills_context_result;

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

    let history = history_result?;
    let asset_count = chunks_used.iter().map(|c| &c.asset_id).collect::<std::collections::HashSet<_>>().len();
    let workspace_context = {
        let wc = workspace_config_result.unwrap_or_else(|_| super::super::WorkspaceConfig::default());
        if wc.code_execution_mode != "disabled" {
            format!(
                "\n\n## Workspace\n\
                 Working Directory: `{}`\n\
                 Shell: persistente entre comandos\n\
                 Puedes leer archivos, ejecutar comandos, y analizar el proyecto.\n\
                 Code Execution Mode: {}",
                wc.working_directory, wc.code_execution_mode
            )
        } else {
            String::new()
        }
    };

    let messages =
        super::super::messages::build_messages(
            &history, &all_project_context, &web_context, &rag_context,
            &skills_context, &identity_context, &workspace_context,
            &input.content, &input.skill_names, asset_count, &input.attachments
        );

    Ok(PreparedContext {
        recall_chunks,
        chunks_used,
        research_sources,
        search_query,
        tool_catalog,
        tools_json,
        history,
        messages,
    })
}
