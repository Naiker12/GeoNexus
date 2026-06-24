use std::time::Instant;

mod temp_files;
mod streaming;
use streaming::emit_stream_event;
mod context;
use context::prepare_context;
mod tool_loop;
use tool_loop::run_tool_loop;

use geonexus_core::chat::{
    Message, MessageRole,
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
use crate::commands::secure::read_secure_value;
use super::context::{build_graph_context, ContextEdge};
use super::stats::extract_message_stats;
use super::validator::validate_response;
use super::{run_sidecar_json, unix_now, AppState, ContextNode};
use crate::commands::graph::crud::bump_use_count;
use crate::commands::graph_events::emit_graph_update;

mod errors;
pub(crate) use errors::scan_for_prompt_injection;

#[derive(Debug, sqlx::FromRow)]
struct EdgeRow {
    source_label: String,
    target_label: String,
    relation: String,
}

#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    mut input: SendMessageInput,
) -> Result<SendMessageResponse, String> {
    input.validate()?;

    if input.api_key.is_none() && !input.provider.trim().is_empty() {
        let secure_key = format!("connector_api_key:{}", input.provider.trim());
        if let Ok(Some(key)) = read_secure_value(
            state.app_handle.as_ref().ok_or("App handle no disponible")?,
            &state.db,
            &secure_key,
        )
        .await
        {
            if !key.is_empty() {
                input.api_key = Some(key);
            }
        }
    }

    let chat_start = Instant::now();
    let trace_id = Uuid::new_v4().to_string();
    let conversation_id = ensure_conversation(&state, &input).await?;
    let assistant_msg_id = Uuid::new_v4().to_string();
    let final_reasoning_content: Option<String>;
    let final_reasoning_duration_ms: Option<u64>;

    // === Intent Classification ===
    let intent = classify_intent(&input.content);
    let intent_label = intent.label().to_string();

    // === Graph nodes + edges for enhanced context ===
    let (graph_nodes_result, graph_edges_result) = tokio::join!(
        sqlx::query_as::<_, ContextNode>(
            "SELECT id, name AS label, kind FROM graph_nodes WHERE project_id = ? LIMIT 8",
        )
        .bind(&input.project_id)
        .fetch_all(&state.db),
        sqlx::query_as::<_, EdgeRow>(
            "SELECT sn.name AS source_label, tn.name AS target_label, e.relation
             FROM graph_edges e
             JOIN graph_nodes sn ON e.source = sn.id
             JOIN graph_nodes tn ON e.target = tn.id
             WHERE e.project_id = ?
             LIMIT 20",
        )
        .bind(&input.project_id)
        .fetch_all(&state.db),
    );
    let graph_nodes: Vec<ContextNode> = graph_nodes_result.unwrap_or_default();
    let graph_edges: Vec<ContextEdge> = graph_edges_result
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
        let _ = bump_use_count(&state.db, &graph_node_ids).await;
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
        attachments: input.attachments.clone(),
        reasoning_events: None,
        reasoning_content: None,
        reasoning_duration_ms: None,
    };

    chat_repo::insert_message(&state.db, &user_msg).await?;

    if input.conversation_id.is_none() {
        let title = super::title_from_message(&input.content);
        let _ = chat_repo::update_conversation_title(&state.db, &conversation_id, &title).await;
    }

    // === Gather all context (FTS5, RAG, project, mention, web, tools, skills, identity, history) ===
    let ctx = prepare_context(&state, &input, &conversation_id, &graph_context).await?;

    let recall_chunks = ctx.recall_chunks;
    let chunks_used = ctx.chunks_used;
    let research_sources = ctx.research_sources;
    let search_query = ctx.search_query;
    let tool_catalog = ctx.tool_catalog;
    let tools_json = ctx.tools_json;
    let history = ctx.history;
    let mut messages = ctx.messages;

    // === Tool-calling loop ===
    let loop_result = run_tool_loop(
        &mut messages,
        &input,
        &tool_catalog,
        &tools_json,
        &trace_id,
        &conversation_id,
        &assistant_msg_id,
        state.app_handle.as_ref(),
        &state.db,
    ).await?;

    let final_content = loop_result.final_content;
    let trajectory_steps = loop_result.trajectory_steps;
    let response_model = loop_result.response_model;
    final_reasoning_content = Some(loop_result.reasoning_content.unwrap_or_default());
    final_reasoning_duration_ms = Some(loop_result.reasoning_duration_ms);

    let last_sidecar = loop_result.last_sidecar;

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
        id: assistant_msg_id,
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
        attachments: vec![],
        reasoning_events: None,
        reasoning_content: final_reasoning_content,
        reasoning_duration_ms: final_reasoning_duration_ms.map(|m| m as i64),
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
                    use_count: 0,
                    last_used_at: None,
                    memory_score: 1.0,
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
                    use_count: 0,
                    last_used_at: None,
                    memory_score: 1.0,
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

    // === Autonomous Skill Creation ===
    // If the trajectory had ≥5 tool calls and the response was successful,
    // auto-create a skill from the procedure.
    if trajectory_steps.len() >= 5 && last_sidecar.is_some() {
        let skill_name = format!("Auto: {}", &input.content[..input.content.len().min(48)]);
        let tags: Vec<String> = trajectory_steps
            .iter()
            .filter_map(|s| s.get("tool").and_then(|t| t.as_str().map(|s| s.to_string())))
            .collect();
        let category = if intent_label.contains("gis") || intent_label.contains("geo") {
            "gis"
        } else if intent_label.contains("research") || intent_label.contains("search") {
            "research"
        } else {
            "agent"
        };
        let _ = geonexus_db::skills::registry::create_skill_from_trajectory(
            &state.db,
            &skill_name,
            &format!("Procedimiento automatico para: {}", input.content.trim()),
            category,
            &input.content,
            &trajectory_steps,
            tags,
        ).await;

        // Emit skill:created event so frontend can notify the user
        if let Some(ref handle) = state.app_handle {
            let _ = emit_stream_event(Some(handle), &json!({
                "type": "skill_created",
                "conversation_id": conversation_id,
                "skill_name": skill_name,
                "auto_generated": true,
            }));
        }
    }

    // === Curated Memory Nudge (fire-and-forget) ===
    // Every 3 messages, extract facts from the conversation via the LLM
    // and store them in curated_memory.
    if history.len() >= 2 && history.len() % 3 == 0 {
        let db = state.db.clone();
        let chat_text = format!("User: {}\nAssistant: {}", input.content, final_content);
        tokio::spawn(async move {
            let prompt = format!(
                "Extrae hechos objetivos y relevantes de esta conversacion. \
                 Clasifica cada hecho en una categoria (project, user, tech, decision, goal, constraint). \
                 Devuelve JSON array {{facts: [{{fact: string, category: string, confidence: float}}]}}.\n\n{}",
                chat_text
            );
            // Use a lightweight extraction — in production, this would call the LLM
            if let Ok(result) = super::run_sidecar_json::<serde_json::Value>(&[
                "--action", "extract_facts",
                "--query", &prompt,
            ]) {
                if let Some(facts) = result["facts"].as_array() {
                    for fact in facts {
                        let fact_text = fact["fact"].as_str().unwrap_or("");
                        let category = fact["category"].as_str().unwrap_or("project");
                        let confidence = fact["confidence"].as_f64().unwrap_or(0.5);
                        if !fact_text.is_empty() {
                            let _ = geonexus_db::memory_repo::add_fact(
                                &db, fact_text, category, "chat", confidence, &[],
                            ).await;
                        }
                    }
                }
            }
        });
    }

    // === User Profile Auto-Derivation (fire-and-forget) ===
    // Derive user preferences/patterns from the current message.
    if !input.content.is_empty() {
        let db = state.db.clone();
        let user_msg = input.content.clone();
        tokio::spawn(async move {
            // Detect common patterns
            let lower = user_msg.to_lowercase();

            // Language preference
            if lower.contains("en ingles") || lower.contains("in english") || lower.contains("speak english") {
                let _ = geonexus_db::user_profile_repo::upsert_profile_entry(
                    &db, "language", "en", "preference", 0.7, "derived",
                ).await;
            } else if lower.contains("en espanol") || lower.contains("en castellano") {
                let _ = geonexus_db::user_profile_repo::upsert_profile_entry(
                    &db, "language", "es", "preference", 0.7, "derived",
                ).await;
            }

            // Verbosity preference
            if lower.contains("resume") || lower.contains("resumido") || lower.contains("breve") || lower.contains("short") {
                let _ = geonexus_db::user_profile_repo::upsert_profile_entry(
                    &db, "verbosity", "concise", "preference", 0.5, "derived",
                ).await;
            } else if lower.contains("detall") || lower.contains("detailed") || lower.contains("extenso") {
                let _ = geonexus_db::user_profile_repo::upsert_profile_entry(
                    &db, "verbosity", "detailed", "preference", 0.5, "derived",
                ).await;
            }

            // Technical level
            if lower.contains("explicate") || lower.contains("explain") || lower.contains("que es") || lower.contains("what is") {
                let _ = geonexus_db::user_profile_repo::upsert_profile_entry(
                    &db, "technical_level", "beginner", "preference", 0.4, "derived",
                ).await;
            }
        });
    }

    // === Patch Proposal Detection (fire-and-forget) ===
    // Scan assistant response for code blocks with file paths and create patch proposals.
    if !final_content.is_empty() {
        let db = state.db.clone();
        let pid = input.project_id.clone();
        let cid = conversation_id.clone();
        let content = final_content.clone();
        let handle = state.app_handle.clone();
        tokio::spawn(async move {
            let mut patches_created = 0usize;
            // Match ```language:file/path or comments like // file: path
            let re = match regex_lite::Regex::new(
                r"(?m)^```\w*:?([^\n]+)\n([\s\S]*?)```"
            ) {
                Ok(r) => r,
                Err(_) => return,
            };

            for cap in re.captures_iter(&content) {
                let file_path = cap.get(1).map(|m| m.as_str().trim()).unwrap_or("");
                let code = cap.get(2).map(|m| m.as_str()).unwrap_or("");
                if file_path.is_empty() || code.is_empty() {
                    continue;
                }
                // Only propose patches for known source file extensions
                let is_source = file_path.ends_with(".rs") || file_path.ends_with(".ts")
                    || file_path.ends_with(".tsx") || file_path.ends_with(".js")
                    || file_path.ends_with(".py") || file_path.ends_with(".sql")
                    || file_path.ends_with(".json") || file_path.ends_with(".toml")
                    || file_path.ends_with(".css") || file_path.ends_with(".html")
                    || file_path.ends_with(".md");
                if !is_source {
                    continue;
                }
                let _ = geonexus_db::patch_repo::create_patch(
                    &db, &pid, &cid, file_path, None, code, None,
                ).await;
                patches_created += 1;
            }

            if patches_created > 0 {
                if let Some(ref h) = handle {
                    let _ = h.emit("chat:stream_event", &serde_json::json!({
                        "type": "patch_proposals_created",
                        "conversation_id": cid,
                        "count": patches_created,
                    }));
                }
            }
        });
    }

    // Build session summary for "vida previa"
    let session_summary = SessionSummary {
        message_count: history.len() + 1,
        skills_in_session: input.skill_names.clone(),
        assets_in_session: chunks_used.iter().map(|c| c.asset_name.clone()).collect(),
        last_topics: vec![],
    };

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


