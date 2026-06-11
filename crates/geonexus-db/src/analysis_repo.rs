use sqlx::{SqlitePool, Row};

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct AnalysisMetrics {
    pub tokens_hoy: i64,
    pub consultas_ia: i64,
    pub costo_estimado: f64,
    pub trazas_guardadas: i64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct TokenBucket {
    pub hora: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub total_tokens: i64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct ModelUsage {
    pub model: String,
    pub provider: String,
    pub tokens: i64,
    pub requests: i64,
    pub input_tokens: i64,
    pub output_tokens: i64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct AnalysisRun {
    pub id: String,
    pub conversation_id: String,
    pub title: String,
    pub model: String,
    pub tokens: i64,
    pub duration_ms: i64,
    pub trace_id: Option<String>,
    pub tool_calls: i64,
    pub created_at: i64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct SkillUsage {
    pub tool_name: String,
    pub calls: i64,
    pub success_rate: f64,
}

pub async fn get_analysis_metrics(pool: &SqlitePool, project_id: &str) -> Result<AnalysisMetrics, String> {
    let row = sqlx::query(
        "SELECT
            COALESCE(SUM(m.total_tokens), 0) AS tokens_hoy,
            COUNT(CASE WHEN m.role = 'assistant' THEN 1 END) AS consultas_ia,
            COALESCE(SUM(m.cost_usd), 0.0) AS costo_estimado,
            (SELECT COUNT(*) FROM chat_tool_calls
             WHERE created_at >= strftime('%s','now','start of day')) AS trazas_guardadas
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.project_id = ?
           AND m.created_at >= strftime('%s', 'now', 'start of day')"
    )
    .bind(project_id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Error obteniendo metricas de analisis: {e}"))?;

    Ok(AnalysisMetrics {
        tokens_hoy: row.get(0),
        consultas_ia: row.get(1),
        costo_estimado: row.get(2),
        trazas_guardadas: row.get(3),
    })
}

pub async fn get_token_timeline(
    pool: &SqlitePool,
    project_id: &str,
    timeframe: &str,
) -> Result<Vec<TokenBucket>, String> {
    let date_filter = match timeframe {
        "7d" => "m.created_at >= strftime('%s', 'now', '-7 days')",
        "30d" => "m.created_at >= strftime('%s', 'now', '-30 days')",
        _ => "m.created_at >= strftime('%s', 'now', 'start of day')",
    };

    let group_fmt = match timeframe {
        "7d" | "30d" => "%d %b",
        _ => "%H:00",
    };

    let query = format!(
        "SELECT
            strftime('{}', datetime(m.created_at, 'unixepoch')) AS hora,
            COALESCE(SUM(m.input_tokens), 0) AS input_tokens,
            COALESCE(SUM(m.output_tokens), 0) AS output_tokens,
            COALESCE(SUM(m.total_tokens), 0) AS total_tokens
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.project_id = ?
           AND {}
           AND m.role = 'assistant'
         GROUP BY strftime('{}', datetime(m.created_at, 'unixepoch'))
         ORDER BY hora ASC",
        group_fmt, date_filter, group_fmt
    );

    let rows = sqlx::query(&query)
        .bind(project_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error obteniendo timeline de tokens: {e}"))?;

    Ok(rows.iter().map(|r| TokenBucket {
        hora: r.get(0),
        input_tokens: r.get(1),
        output_tokens: r.get(2),
        total_tokens: r.get(3),
    }).collect())
}

pub async fn get_model_usage(pool: &SqlitePool, project_id: &str) -> Result<Vec<ModelUsage>, String> {
    let rows = sqlx::query(
            "SELECT
            COALESCE(c.model, 'desconocido') AS model,
            COALESCE(c.provider, 'desconocido') AS provider,
            COUNT(m.id) AS requests,
            COALESCE(SUM(m.total_tokens), 0) AS tokens,
            COALESCE(SUM(m.input_tokens), 0) AS input_tokens,
            COALESCE(SUM(m.output_tokens), 0) AS output_tokens
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.project_id = ?
           AND m.role = 'assistant'
         GROUP BY c.model, c.provider
         ORDER BY tokens DESC"
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error obteniendo uso por modelo: {e}"))?;

    Ok(rows.iter().map(|r| ModelUsage {
        model: r.get(0),
        provider: r.get(1),
        requests: r.get(2),
        tokens: r.get(3),
        input_tokens: r.get(4),
        output_tokens: r.get(5),
    }).collect())
}

pub async fn list_analysis_runs(pool: &SqlitePool, project_id: &str) -> Result<Vec<AnalysisRun>, String> {
    let rows = sqlx::query(
        "SELECT
            m.id,
            m.conversation_id,
            COALESCE(c.title, 'Conversacion sin titulo') AS title,
            COALESCE(c.model, m.model, 'desconocido') AS model,
            COALESCE(m.total_tokens, 0) AS tokens,
            COALESCE(m.duration_ms, 0) AS duration_ms,
            m.trace_id,
            (SELECT COUNT(*) FROM chat_tool_calls t WHERE t.message_id = m.id) AS tool_calls,
            m.created_at
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.project_id = ?
           AND m.role = 'assistant'
         ORDER BY m.created_at DESC
         LIMIT 50"
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error listando trazas de analisis: {e}"))?;

    Ok(rows.iter().map(|r| AnalysisRun {
        id: r.get(0),
        conversation_id: r.get(1),
        title: r.get(2),
        model: r.get(3),
        tokens: r.get(4),
        duration_ms: r.get(5),
        trace_id: r.get(6),
        tool_calls: r.get(7),
        created_at: r.get(8),
    }).collect())
}

pub async fn get_skill_usage(pool: &SqlitePool, project_id: &str) -> Result<Vec<SkillUsage>, String> {
    let rows = sqlx::query(
        "SELECT
            t.tool_name,
            COUNT(*) AS calls,
            ROUND(
                100.0 * SUM(CASE WHEN t.result_status = 'success' THEN 1 ELSE 0 END) / COUNT(*),
                1
            ) AS success_rate
         FROM chat_tool_calls t
         JOIN messages m ON t.message_id = m.id
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.project_id = ?
         GROUP BY t.tool_name
         ORDER BY calls DESC"
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error obteniendo skills usadas: {e}"))?;

    Ok(rows.iter().map(|r| SkillUsage {
        tool_name: r.get(0),
        calls: r.get(1),
        success_rate: r.get(2),
    }).collect())
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct CostSummary {
    pub cost_hoy: f64,
    pub cost_7d: f64,
    pub cost_total: f64,
    pub avg_per_query: f64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct TopQuery {
    pub title: String,
    pub runs: i64,
    pub tokens: i64,
}

pub async fn get_cost_by_timeframe(pool: &SqlitePool, project_id: &str) -> Result<CostSummary, String> {
    let row = sqlx::query(
        "SELECT
            COALESCE(SUM(CASE WHEN m.created_at >= strftime('%s','now','start of day') THEN m.cost_usd ELSE 0 END), 0.0) AS cost_hoy,
            COALESCE(SUM(CASE WHEN m.created_at >= strftime('%s','now','-7 days') THEN m.cost_usd ELSE 0 END), 0.0) AS cost_7d,
            COALESCE(SUM(m.cost_usd), 0.0) AS cost_total,
            COALESCE(AVG(m.cost_usd), 0.0) AS avg_per_query
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.project_id = ?
           AND m.role = 'assistant'"
    )
    .bind(project_id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Error obteniendo resumen de costos: {e}"))?;

    Ok(CostSummary {
        cost_hoy: row.get(0),
        cost_7d: row.get(1),
        cost_total: row.get(2),
        avg_per_query: row.get(3),
    })
}

pub async fn get_top_queries(pool: &SqlitePool, project_id: &str, limit: i64) -> Result<Vec<TopQuery>, String> {
    let rows = sqlx::query(
        "SELECT
            COALESCE(c.title, 'Sin titulo') AS title,
            COUNT(*) AS runs,
            COALESCE(SUM(m.total_tokens), 0) AS tokens
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.project_id = ?
           AND m.role = 'assistant'
         GROUP BY c.title
         ORDER BY tokens DESC
         LIMIT ?"
    )
    .bind(project_id)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error obteniendo consultas top: {e}"))?;

    Ok(rows.iter().map(|r| TopQuery {
        title: r.get(0),
        runs: r.get(1),
        tokens: r.get(2),
    }).collect())
}

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
