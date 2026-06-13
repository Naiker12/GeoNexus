use tauri::{Emitter, State};
use uuid::Uuid;
use crate::AppState;
use geonexus_core::agent::Agent;
use geonexus_mcp::{registry, executor};
use geonexus_mcp::types::{CallToolPayload, McpTool, McpStatus, ToolStatus};
use super::chat::{run_sidecar_json, RecallChunk};

#[tauri::command]
pub async fn list_agents(state: State<'_, AppState>) -> Result<Vec<Agent>, String> {
    geonexus_db::agent_repo::list_agents(&state.db).await
}

#[tauri::command]
pub async fn toggle_agent(
    agent_id: String,
    active: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if agent_id.trim().is_empty() {
        return Err("agent_id requerido".into());
    }
    geonexus_db::agent_repo::toggle_agent(&state.db, &agent_id, active).await
}

fn emit_event(app: &tauri::AppHandle, agent: &str, status: &str, message: &str, data: Option<serde_json::Value>) {
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64;
    let payload = serde_json::json!({
        "agent": agent,
        "status": status,
        "message": message,
        "timestamp": now_ms,
        "data": data,
    });
    let _ = app.emit("agent:event", payload);
}

async fn get_mcp_servers_context(pool: &sqlx::SqlitePool) -> Result<String, String> {
    let rows: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT id, name, status FROM mcp_servers ORDER BY status ASC"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    if rows.is_empty() {
        return Ok("No hay servidores MCP registrados.".into());
    }

    let mut lines = vec!["Servidores MCP disponibles:".to_string()];
    for (id, name, status) in &rows {
        lines.push(format!("  - {} ({}) — {}", name, id, status));
        // fetch tools for this server
        let tools: Vec<String> = sqlx::query_scalar(
            "SELECT name FROM mcp_tools WHERE server_id = ?1 ORDER BY name"
        )
        .bind(id)
        .fetch_all(pool)
        .await
        .unwrap_or_default();
        if !tools.is_empty() {
            lines.push(format!("    Tools: {}", tools.join(", ")));
        }
    }
    Ok(lines.join("\n"))
}

async fn get_graph_context(pool: &sqlx::SqlitePool) -> Result<String, String> {
    let nodes: Vec<String> = sqlx::query_scalar(
        "SELECT name FROM graph_nodes ORDER BY created_at DESC LIMIT 10"
    )
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    if nodes.is_empty() {
        return Ok(String::new());
    }
    Ok(format!("Nodos del grafo de conocimiento: {}.", nodes.join(", ")))
}

#[tauri::command]
pub async fn run_agent_pipeline(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    goal: String,
    sources: Vec<String>,
    trace_id: String,
) -> Result<String, String> {
    if goal.trim().is_empty() {
        return Err("El objetivo no puede estar vacío".into());
    }

    let trace_id = trace_id;

    emit_event(&app_handle, "planner", "running", "Analizando objetivo...", None);

    // ── Phase: Planner ──────────────────────────────────────────────
    let mcp_context = get_mcp_servers_context(&state.db).await.unwrap_or_default();
    let graph_context = get_graph_context(&state.db).await.unwrap_or_default();

    let source_hint = if sources.is_empty() {
        String::new()
    } else {
        format!("\nFuentes solicitadas por el usuario: {}", sources.join(", "))
    };

    let plan = serde_json::json!({
        "goal": goal,
        "steps": [
            { "agent": "discovery", "action": "Buscar datos relevantes", "status": "pending" },
            { "agent": "knowledge", "action": "Extraer conocimiento", "status": "pending" },
            { "agent": "mcp", "action": "Ejecutar herramientas MCP", "status": "pending" },
            { "agent": "reasoning", "action": "Razonar con contexto", "status": "pending" },
            { "agent": "result", "action": "Generar respuesta final", "status": "pending" }
        ],
        "sources": sources.iter().map(|s| serde_json::json!({"type": s})).collect::<Vec<_>>(),
    });

    emit_event(&app_handle, "planner", "done", "Plan generado exitosamente", Some(plan.clone()));

    // ── Phase: Discovery ────────────────────────────────────────────
    emit_event(&app_handle, "discovery", "running", "Descubriendo datos y herramientas...", None);

    let discovered = serde_json::json!([
        { "id": Uuid::new_v4().to_string(), "name": "mcp-servers", "type": "api", "source": { "type": "memory" } }
    ]);

    emit_event(&app_handle, "discovery", "done", &format!("Contexto cargado: servidores MCP y grafo de conocimiento"), Some(discovered));

    // ── Phase: Knowledge ────────────────────────────────────────────
    emit_event(&app_handle, "knowledge", "running", "Extrayendo conocimiento del contexto (ChromaDB)...", None);

    let knowledge_chunks: Vec<RecallChunk> = run_sidecar_json::<Vec<RecallChunk>>(&[
        "--action", "recall_chunks",
        "--query", &goal,
        "--project_id", "project-default",
        "--top_k", "6",
        "--collection", "project_memory",
    ]).unwrap_or_default();

    let knowledge_summary = if knowledge_chunks.is_empty() {
        "No se encontraron documentos indexados en la memoria del proyecto.".to_string()
    } else {
        format!("Se recuperaron {} fragmentos de la memoria vectorial.", knowledge_chunks.len())
    };

    let knowledge_data = serde_json::json!(knowledge_chunks);
    emit_event(&app_handle, "knowledge", "done", &knowledge_summary, Some(knowledge_data));

    // ── Phase: MCP ──────────────────────────────────────────────────
    emit_event(&app_handle, "mcp", "running", "Ejecutando herramientas MCP relevantes...", None);

    let servers = registry::list_servers(&state.db).await.unwrap_or_default();
    let mut mcp_result_lines: Vec<String> = Vec::new();

    for server in &servers {
        if !matches!(server.status, McpStatus::Online) { continue; }

        let tools: Vec<McpTool> = registry::list_tools(&state.db, &server.id)
            .await
            .unwrap_or_default();

        for tool in &tools {
            if !matches!(tool.status, ToolStatus::Ready) { continue; }

            let allowed = registry::check_allowlist(&state.db, &server.id, &tool.name)
                .await
                .unwrap_or(true);
            if !allowed { continue; }

            emit_event(&app_handle, "mcp", "running", &format!("Ejecutando {}/{}...", server.name, tool.name), None);

            let payload = CallToolPayload {
                server_id: server.id.clone(),
                tool: tool.name.clone(),
                args: serde_json::json!({"query": goal, "sources": sources}),
                trace_id: trace_id.clone(),
                agent_name: Some("mcp".to_string()),
            };

            match executor::call_tool(&state.db, &server.url, payload).await {
                Ok(result) if result.success => {
                    let msg = format!("{}/{}: OK ({}ms)", server.name, tool.name, result.duration_ms);
                    emit_event(&app_handle, "mcp", "done", &msg, result.data.clone());
                    mcp_result_lines.push(format!("- {}: {}", server.name, tool.name));
                    if let Some(ref data) = result.data {
                        mcp_result_lines.push(format!("  Resultado: {}", serde_json::to_string(data).unwrap_or_default()));
                    }
                }
                Ok(result) => {
                    let err = result.error.as_deref().unwrap_or("error desconocido");
                    emit_event(&app_handle, "mcp", "error", &format!("{}/{} falló: {}", server.name, tool.name, err), None);
                    mcp_result_lines.push(format!("- {}: {} — {}", server.name, tool.name, err));
                }
                Err(e) => {
                    emit_event(&app_handle, "mcp", "error", &format!("{}/{} error: {}", server.name, tool.name, e), None);
                    mcp_result_lines.push(format!("- {}: {} — error: {}", server.name, tool.name, e));
                }
            }
        }
    }

    let mcp_result_context = if mcp_result_lines.is_empty() {
        String::new()
    } else {
        format!("Resultados de herramientas MCP ejecutadas:\n{}\n", mcp_result_lines.join("\n"))
    };

    emit_event(&app_handle, "mcp", "done", &format!("{} herramientas MCP procesadas", mcp_result_lines.len()), None);

    // ── Phase: Reasoning ────────────────────────────────────────────
    emit_event(&app_handle, "reasoning", "running", "Razonando con contexto enriquecido...", None);

    let knowledge_context = if knowledge_chunks.is_empty() {
        String::new()
    } else {
        let texts: Vec<&str> = knowledge_chunks.iter().map(|c| c.text.as_str()).collect();
        format!("Conocimiento recuperado de la memoria del proyecto:\n{}\n", texts.join("\n---\n"))
    };

    let final_answer = generate_answer(&goal, &mcp_context, &graph_context, &knowledge_context, &mcp_result_context, &source_hint, &state.db).await?;

    emit_event(&app_handle, "reasoning", "done", "Razonamiento completado", None);

    // ── Phase: Result ───────────────────────────────────────────────
    emit_event(&app_handle, "result", "done", &final_answer, None);

    Ok(final_answer)
}

async fn generate_answer(
    goal: &str,
    mcp_context: &str,
    graph_context: &str,
    knowledge_context: &str,
    mcp_result_context: &str,
    source_hint: &str,
    pool: &sqlx::SqlitePool,
) -> Result<String, String> {
    let retrieved = if knowledge_context.is_empty() {
        String::new()
    } else {
        format!("\n{}\n", knowledge_context)
    };

    let mcp_results = if mcp_result_context.is_empty() {
        String::new()
    } else {
        format!("\n{}\n", mcp_result_context)
    };

    let system_prompt = format!(
        "Eres GeoAgents, un sistema multi-agente especializado en análisis geoespacial y normativo.\n\
         Tu rol es responder al objetivo del usuario usando:\n\
         - El contexto de servidores MCP disponibles\n\
         - El grafo de conocimiento del proyecto\n\
         - La memoria vectorial del proyecto (documentos indexados)\n\
         - Los resultados de ejecución de herramientas MCP\n\
         - Las fuentes solicitadas (si las hay)\n\n\
         Contexto:\n{}\n{}{}{}\n{}\n\n\
         Objetivo: {}",
        mcp_context, graph_context, retrieved, mcp_results, source_hint, goal
    );

    // Try to use an LLM if one is configured via the sidecar
    let result = run_sidecar_llm(&system_prompt, pool).await;

    match result {
        Ok(answer) if !answer.is_empty() => Ok(answer),
        _ => {
            let mcp_count = mcp_context.lines().filter(|l| l.starts_with("  - ")).count();
            let mut answer = format!(
                "## Análisis: {}\n\n", goal
            );
            if mcp_count > 0 {
                answer.push_str(&format!("Se identificaron **{} servidores MCP** disponibles para procesar la solicitud.\n\n", mcp_count));
                answer.push_str("### Contexto disponible\n");
                for line in mcp_context.lines() {
                    if line.starts_with("  - ") || line.starts_with("    ") {
                        answer.push_str(line);
                        answer.push('\n');
                    }
                }
                answer.push('\n');
            }
            if !graph_context.is_empty() {
                answer.push_str(&format!("### Conocimiento del proyecto\n{}\n\n", graph_context));
            }
            if !mcp_result_context.is_empty() {
                answer.push_str("### Resultados de herramientas MCP\n");
                answer.push_str(mcp_result_context);
                answer.push('\n');
            }
            if !knowledge_context.is_empty() {
                answer.push_str("### Conocimiento de memoria vectorial\n");
                answer.push_str(knowledge_context);
                answer.push('\n');
            }
            answer.push_str("### Pasos siguientes\n");
            answer.push_str("1. Conectar a los servidores MCP para ejecutar herramientas geoespaciales\n");
            answer.push_str("2. Consultar el grafo de conocimiento para contexto adicional\n");
            answer.push_str("3. Generar resultado detallado con datos en tiempo real\n\n");
            answer.push_str("> *Para obtener respuestas más precisas, conecta un proveedor LLM en Configuración → Modelos IA.*");
            Ok(answer)
        }
    }
}

async fn run_sidecar_llm(system_prompt: &str, pool: &sqlx::SqlitePool) -> Result<String, String> {
    // Check if there's an active AI connector configured
    let provider: Option<String> = sqlx::query_scalar(
        "SELECT endpoint FROM ai_connectors WHERE status = 'online' LIMIT 1"
    )
    .fetch_optional(pool)
    .await
    .map_err(|_| String::new())
    .ok()
    .flatten();

    if provider.is_none() {
        return Err("Sin proveedor LLM configurado".into());
    }

    // If sidecar is available, use it
    let args = vec![
        "--action", "chat_llm",
        "--system_prompt", system_prompt,
        "--max_tokens", "1024",
    ];

    match crate::commands::chat::run_sidecar_json::<serde_json::Value>(&args) {
        Ok(val) => {
            let content = val["content"].as_str()
                .or_else(|| val["text"].as_str())
                .or_else(|| val["response"].as_str())
                .map(String::from)
                .ok_or_else(|| "Respuesta vacía del LLM".to_string())?;
            Ok(content)
        }
        Err(e) => Err(format!("Error LLM: {e}"))
    }
}
