use sqlx::{SqlitePool, Row};
use crate::analysis_repo::{CostSummary, TopQuery};

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
