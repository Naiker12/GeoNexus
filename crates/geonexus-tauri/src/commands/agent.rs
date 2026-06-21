use tauri::{Emitter, State};
use uuid::Uuid;
use crate::AppState;
use geonexus_core::agent::Agent;
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

#[tauri::command]
pub async fn set_agent_model(
    agent_id: String,
    model_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    sqlx::query("UPDATE agents SET model_name = ?1, updated_at = ?2 WHERE id = ?3")
        .bind(&model_name)
        .bind(now)
        .bind(&agent_id)
        .execute(&state.db)
        .await
        .map_err(|e| format!("Error al asignar modelo al agente: {e}"))?;
    Ok(())
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

    let _trace_id = trace_id;

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

    // ── Phase: MCP (contexto solamente — el LLM decide qué tools invocar) ──
    let mcp_tool_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM mcp_tools t
         JOIN mcp_servers s ON s.id = t.server_id
         WHERE s.disabled = 0 AND t.status = 'ready'",
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    emit_event(
        &app_handle,
        "mcp",
        "done",
        &format!(
            "{} herramientas MCP registradas (disponibles vía chat/tool-calling)",
            mcp_tool_count
        ),
        Some(serde_json::json!({ "tools_count": mcp_tool_count })),
    );

    let mcp_result_context = String::new();

    let knowledge_context = if knowledge_chunks.is_empty() {
        String::new()
    } else {
        let texts: Vec<&str> = knowledge_chunks.iter().map(|c| c.text.as_str()).collect();
        format!("Conocimiento recuperado de la memoria del proyecto:\n{}\n", texts.join("\n---\n"))
    };

    let final_answer = generate_answer(&goal, &mcp_context, &graph_context, &knowledge_context, &mcp_result_context, &source_hint, &state.db).await?;

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

// ── Agent Task Board (new system) ─────────────────────────────────────────

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct AgentTask {
    pub id: String,
    pub title: String,
    pub notes: Option<String>,
    pub status: String,
    pub priority: String,
    pub data: String,
    pub project_path: Option<String>,
    pub connector_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl AgentTask {
    fn new(title: String, notes: Option<String>, priority: String,
           project_path: Option<String>, connector_id: Option<String>) -> Self {
        let now = chrono::Utc::now().timestamp_millis();
        Self {
            id: Uuid::new_v4().to_string(),
            title,
            notes,
            status: "todo".into(),
            priority,
            data: "{}".into(),
            project_path,
            connector_id,
            created_at: now,
            updated_at: now,
        }
    }
}

#[tauri::command]
pub async fn agent_list_tasks(state: State<'_, AppState>) -> Result<Vec<AgentTask>, String> {
    let rows = sqlx::query_as::<_, (String, String, Option<String>, String, String, String, Option<String>, Option<String>, i64, i64)>(
        "SELECT id, title, notes, status, priority, data, project_path, connector_id, created_at, updated_at
         FROM agent_task_board ORDER BY created_at DESC LIMIT 50"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| format!("Error al listar tareas: {e}"))?;

    Ok(rows.into_iter().map(|(id, title, notes, status, priority, data, project_path, connector_id, created_at, updated_at)| AgentTask {
        id, title, notes, status, priority, data, project_path, connector_id, created_at, updated_at
    }).collect())
}

#[tauri::command]
pub async fn agent_create_task(
    title: String,
    notes: Option<String>,
    priority: Option<String>,
    project_path: Option<String>,
    connector_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<AgentTask, String> {
    let task = AgentTask::new(
        title,
        notes,
        priority.unwrap_or_else(|| "normal".into()),
        project_path,
        connector_id,
    );

    sqlx::query(
        "INSERT INTO agent_task_board (id, title, notes, status, priority, data, project_path, connector_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"
    )
    .bind(&task.id)
    .bind(&task.title)
    .bind(&task.notes)
    .bind(&task.status)
    .bind(&task.priority)
    .bind(&task.data)
    .bind(&task.project_path)
    .bind(&task.connector_id)
    .bind(task.created_at)
    .bind(task.updated_at)
    .execute(&state.db)
    .await
    .map_err(|e| format!("Error al crear tarea: {e}"))?;

    Ok(task)
}

#[tauri::command]
pub async fn agent_start_task(
    task_id: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let now = chrono::Utc::now().timestamp_millis();
    let claim = serde_json::json!({
        "startedAt": now,
        "heartbeatAt": now,
        "expiresAt": now + 60_000
    });

    sqlx::query(
        "UPDATE agent_task_board SET status = 'running', data = ?1, updated_at = ?2 WHERE id = ?3"
    )
    .bind(claim.to_string())
    .bind(now)
    .bind(&task_id)
    .execute(&state.db)
    .await
    .map_err(|e| format!("Error al iniciar tarea: {e}"))?;

    let _ = app.emit("agent:task", serde_json::json!({
        "kind": "started",
        "taskId": task_id
    }));

    // Spawn heartbeat + execution
    let app_clone = app.clone();
    let db = state.db.clone();
    tauri::async_runtime::spawn(async move {
        run_agent_task(task_id, app_clone, db).await;
    });

    Ok(())
}

#[tauri::command]
pub async fn agent_cancel_task(
    task_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let now = chrono::Utc::now().timestamp_millis();
    sqlx::query(
        "UPDATE agent_task_board SET status = 'todo', data = '{}', updated_at = ?1 WHERE id = ?2"
    )
    .bind(now)
    .bind(&task_id)
    .execute(&state.db)
    .await
    .map_err(|e| format!("Error al cancelar tarea: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn agent_retry_task(
    task_id: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    agent_start_task(task_id, app, state).await
}

#[tauri::command]
pub async fn agent_delete_task(
    task_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    sqlx::query("DELETE FROM agent_task_board WHERE id = ?1")
        .bind(&task_id)
        .execute(&state.db)
        .await
        .map_err(|e| format!("Error al eliminar tarea: {e}"))?;
    Ok(())
}

async fn run_agent_task(
    task_id: String,
    app: tauri::AppHandle,
    db: sqlx::SqlitePool,
) {
    use crate::commands::chat::run_sidecar_json;

    // Heartbeat loop
    let heartbeat_id = task_id.clone();
    let heartbeat_app = app.clone();
    let heartbeat_db = db.clone();
    let heartbeat = tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(15)).await;
            let now = chrono::Utc::now().timestamp_millis();
            let _ = sqlx::query(
                "UPDATE agent_task_board SET data = json_set(data, '$.heartbeatAt', ?1), updated_at = ?2 WHERE id = ?3"
            )
            .bind(now)
            .bind(now)
            .bind(&heartbeat_id)
            .execute(&heartbeat_db)
            .await;
            let _ = heartbeat_app.emit("agent:task", serde_json::json!({
                "kind": "heartbeat",
                "taskId": heartbeat_id,
                "note": null
            }));
        }
    });

    // Read task details
    let task_info: Option<(String, Option<String>, String)> = sqlx::query_as(
        "SELECT title, notes, data FROM agent_task_board WHERE id = ?1"
    )
    .bind(&task_id)
    .fetch_optional(&db)
    .await
    .unwrap_or(None);

    let (title, _notes, _data_json) = match task_info {
        Some(t) => t,
        None => {
            heartbeat.abort();
            return;
        }
    };

    let _ = app.emit("agent:task", serde_json::json!({
        "kind": "comment",
        "taskId": task_id,
        "text": format!("Iniciando tarea: {}", title)
    }));

    // Try to use LLM via sidecar
    let system_prompt = format!(
        "Eres el agente autónomo de GeoNexus. Tu tarea es: {}\n\n\
         Trabajas dentro del proyecto en disco. Puedes leer y escribir archivos.\n\
         Al completar, entrega un resumen de lo que hiciste y qué archivos creaste/modificaste.\n\
         Si encuentras un error, indícalo claramente.",
        title
    );

    let result = run_sidecar_json::<serde_json::Value>(&[
        "--action", "chat_llm",
        "--system_prompt", &system_prompt,
        "--max_tokens", "2048",
    ]);

    match result {
        Ok(val) => {
            let summary = val["content"].as_str()
                .or_else(|| val["text"].as_str())
                .or_else(|| val["response"].as_str())
                .unwrap_or("Tarea completada");

            let now = chrono::Utc::now().timestamp_millis();
            let data = serde_json::json!({
                "comments": [format!("✓ {}", summary)],
                "artifacts": [],
                "attempts": [{
                    "id": Uuid::new_v4().to_string(),
                    "startedAt": now - 5000,
                    "endedAt": now,
                    "status": "succeeded",
                    "summary": summary
                }]
            });

            let _ = sqlx::query(
                "UPDATE agent_task_board SET status = 'done', data = ?1, updated_at = ?2 WHERE id = ?3"
            )
            .bind(data.to_string())
            .bind(now)
            .bind(&task_id)
            .execute(&db)
            .await;

            let _ = app.emit("agent:task", serde_json::json!({
                "kind": "completed",
                "taskId": task_id,
                "summary": summary,
                "artifacts": []
            }));

            heartbeat.abort();
        }
        Err(e) => {
            let now = chrono::Utc::now().timestamp_millis();
            let data = serde_json::json!({
                "blockedReason": format!("Error del LLM: {}", e),
                "comments": [format!("Error: {}", e)],
                "attempts": [{
                    "id": Uuid::new_v4().to_string(),
                    "startedAt": now - 5000,
                    "endedAt": now,
                    "status": "failed"
                }]
            });

            let _ = sqlx::query(
                "UPDATE agent_task_board SET status = 'blocked', data = ?1, updated_at = ?2 WHERE id = ?3"
            )
            .bind(data.to_string())
            .bind(now)
            .bind(&task_id)
            .execute(&db)
            .await;

            let _ = app.emit("agent:task", serde_json::json!({
                "kind": "blocked",
                "taskId": task_id,
                "reason": format!("Error del LLM: {}", e)
            }));

            heartbeat.abort();
        }
    }
}
