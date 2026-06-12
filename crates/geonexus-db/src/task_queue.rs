use geonexus_core::agents::task::AgentTask;
use sqlx::SqlitePool;
use sqlx::Row;

fn now_iso() -> String {
    let dur = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{:010}.{:03}", dur.as_secs(), dur.subsec_millis())
}

const SELECT_COLS: &str =
    "id, agent_type, payload, status, created_at, started_at, completed_at, error, retry_count, max_retries, project_id";

fn row_to_task(r: &sqlx::sqlite::SqliteRow) -> AgentTask {
    AgentTask {
        id: r.get("id"),
        agent_type: r.get("agent_type"),
        payload: r.get("payload"),
        status: r.get("status"),
        created_at: r.get("created_at"),
        started_at: r.get("started_at"),
        completed_at: r.get("completed_at"),
        error: r.get("error"),
        retry_count: r.get("retry_count"),
        max_retries: r.get("max_retries"),
        project_id: r.get("project_id"),
    }
}

pub async fn enqueue(pool: &SqlitePool, task: &AgentTask) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO agent_tasks (id, agent_type, payload, status, created_at, retry_count, max_retries, project_id)
         VALUES (?, ?, ?, 'pending', ?, 0, ?, ?)",
    )
    .bind(&task.id)
    .bind(&task.agent_type)
    .bind(&task.payload)
    .bind(&task.created_at)
    .bind(task.max_retries)
    .bind(&task.project_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error al encolar tarea: {e}"))?;
    Ok(())
}

pub async fn pop_pending(pool: &SqlitePool) -> Result<Option<AgentTask>, String> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Error al iniciar transacción: {e}"))?;

    let row = sqlx::query(&format!(
        "SELECT {SELECT_COLS} FROM agent_tasks WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
    ))
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| format!("Error al desencolar tarea: {e}"))?;

    let task = row.as_ref().map(|r| row_to_task(r));

    if let Some(ref t) = task {
        sqlx::query("UPDATE agent_tasks SET status = 'running', started_at = ? WHERE id = ?")
            .bind(&now_iso())
            .bind(&t.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Error al marcar tarea como running: {e}"))?;
    }

    tx.commit()
        .await
        .map_err(|e| format!("Error al confirmar transacción: {e}"))?;

    Ok(task)
}

pub async fn mark_completed(pool: &SqlitePool, task_id: &str) -> Result<(), String> {
    sqlx::query(
        "UPDATE agent_tasks SET status = 'completed', completed_at = ? WHERE id = ?",
    )
    .bind(&now_iso())
    .bind(task_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error al completar tarea: {e}"))?;
    Ok(())
}

pub async fn mark_failed(pool: &SqlitePool, task_id: &str, error: &str) -> Result<(), String> {
    sqlx::query(
        "UPDATE agent_tasks SET status = 'failed', completed_at = ?, error = ? WHERE id = ?",
    )
    .bind(&now_iso())
    .bind(error)
    .bind(task_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error al fallar tarea: {e}"))?;
    Ok(())
}

pub async fn mark_retry(pool: &SqlitePool, task_id: &str, error: &str) -> Result<(), String> {
    sqlx::query(
        "UPDATE agent_tasks SET status = 'pending', error = ?, retry_count = retry_count + 1, started_at = NULL WHERE id = ?",
    )
    .bind(error)
    .bind(task_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error al reintentar tarea: {e}"))?;
    Ok(())
}

pub async fn list(
    pool: &SqlitePool,
    project_id: &str,
    status_filter: Option<&str>,
) -> Result<Vec<AgentTask>, String> {
    let (where_clause, bind_val): (&str, Option<&str>) = match status_filter {
        Some(s) => ("WHERE project_id = ? AND status = ?", Some(s)),
        None => ("WHERE project_id = ?", None),
    };

    let sql = format!(
        "SELECT {SELECT_COLS} FROM agent_tasks {} ORDER BY created_at DESC LIMIT 50",
        where_clause
    );

    let mut query = sqlx::query(&sql).bind(project_id);
    if let Some(status) = bind_val {
        query = query.bind(status);
    }

    let rows = query
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error al listar tareas: {e}"))?;

    Ok(rows.iter().map(|r| row_to_task(r)).collect())
}
