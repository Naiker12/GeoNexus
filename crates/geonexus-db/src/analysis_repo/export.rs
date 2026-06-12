use sqlx::{SqlitePool, Row};

pub async fn export_traces_as_csv(pool: &SqlitePool, project_id: &str) -> Result<String, String> {
    let rows = sqlx::query(
        "SELECT
            m.conversation_id,
            COALESCE(c.title, 'Sin titulo') AS title,
            COALESCE(c.model, 'desconocido') AS model,
            m.role,
            COALESCE(m.total_tokens, 0) AS total_tokens,
            COALESCE(m.cost_usd, 0.0) AS cost_usd,
            COALESCE(m.duration_ms, 0) AS duration_ms,
            COALESCE(m.trace_id, '') AS trace_id,
            m.created_at
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.project_id = ?
         ORDER BY m.created_at DESC
         LIMIT 500"
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error exportando trazas: {e}"))?;

    let mut csv = String::from("conversation_id,title,model,role,total_tokens,cost_usd,duration_ms,trace_id,created_at\n");
    for r in &rows {
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{}\n",
            r.get::<String, _>(0).replace(',', " "),
            r.get::<String, _>(1).replace(',', " "),
            r.get::<String, _>(2),
            r.get::<String, _>(3),
            r.get::<i64, _>(4),
            r.get::<f64, _>(5),
            r.get::<i64, _>(6),
            r.get::<String, _>(7),
            r.get::<i64, _>(8),
        ));
    }
    Ok(csv)
}

pub async fn export_traces_as_json(pool: &SqlitePool, project_id: &str) -> Result<String, String> {
    let rows = sqlx::query(
        "SELECT
            m.conversation_id,
            COALESCE(c.title, 'Sin titulo') AS title,
            COALESCE(c.model, 'desconocido') AS model,
            m.role,
            COALESCE(m.total_tokens, 0) AS total_tokens,
            COALESCE(m.cost_usd, 0.0) AS cost_usd,
            COALESCE(m.duration_ms, 0) AS duration_ms,
            COALESCE(m.trace_id, '') AS trace_id,
            m.created_at
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.project_id = ?
         ORDER BY m.created_at DESC
         LIMIT 500"
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error exportando trazas JSON: {e}"))?;

    let entries: Vec<serde_json::Value> = rows.iter().map(|r| {
        serde_json::json!({
            "conversation_id": r.get::<String, _>(0),
            "title": r.get::<String, _>(1),
            "model": r.get::<String, _>(2),
            "role": r.get::<String, _>(3),
            "total_tokens": r.get::<i64, _>(4),
            "cost_usd": r.get::<f64, _>(5),
            "duration_ms": r.get::<i64, _>(6),
            "trace_id": r.get::<String, _>(7),
            "created_at": r.get::<i64, _>(8),
        })
    }).collect();

    serde_json::to_string_pretty(&entries)
        .map_err(|e| format!("Error serializando JSON: {e}"))
}
