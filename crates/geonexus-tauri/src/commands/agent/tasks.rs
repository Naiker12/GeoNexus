use tauri::{Emitter, State};
use uuid::Uuid;
use crate::AppState;

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
    use super::super::chat::run_sidecar_json;

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
