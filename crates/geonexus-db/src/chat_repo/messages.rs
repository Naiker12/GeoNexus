use sqlx::SqlitePool;
use geonexus_core::chat::Message;
use crate::chat_repo::{row_to_message, conversations::update_conversation_timestamp};

pub async fn insert_message(pool: &SqlitePool, msg: &Message) -> Result<(), String> {
    let role = serde_json::to_string(&msg.role)
        .map_err(|e| format!("Error serializando role: {e}"))?
        .trim_matches('"')
        .to_string();
    let chunks = serde_json::to_string(&msg.chunks_used).unwrap_or_else(|_| "[]".into());
    let nodes = serde_json::to_string(&msg.nodes_used).unwrap_or_else(|_| "[]".into());
    let tools = serde_json::to_string(&msg.tool_calls).unwrap_or_else(|_| "[]".into());
    let sources = serde_json::to_string(&msg.sources).unwrap_or_else(|_| "[]".into());
    let research_sources_ser = serde_json::to_string(&msg.research_sources).unwrap_or_else(|_| "[]".into());
    let attachments_ser = serde_json::to_string(&msg.attachments).unwrap_or_else(|_| "[]".into());

    let (it, ot, tt, dur, tps, cost, cw, cup) = if let Some(ref s) = msg.stats {
        (Some(s.input_tokens as i64), Some(s.output_tokens as i64), Some(s.total_tokens as i64),
         Some(s.duration_ms as i64), Some(s.tokens_per_second as f64), Some(s.cost_usd),
         Some(s.context_window as i64), Some(s.context_used_pct as f64))
    } else {
        (None, None, None, None, None, None, None, None)
    };

    sqlx::query(
        "INSERT INTO messages
            (id, conversation_id, role, content, provider, model,
             trace_id, chunks_used, nodes_used, tool_calls, sources_json, research_sources, attachments_json, created_at,
             input_tokens, output_tokens, total_tokens, duration_ms,
             tokens_per_second, cost_usd, context_window, context_used_pct)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&msg.id)
    .bind(&msg.conversation_id)
    .bind(&role)
    .bind(&msg.content)
    .bind(&msg.provider)
    .bind(&msg.model)
    .bind(&msg.trace_id)
    .bind(&chunks)
    .bind(&nodes)
    .bind(&tools)
    .bind(&sources)
    .bind(&research_sources_ser)
    .bind(&attachments_ser)
    .bind(msg.created_at)
    .bind(it)
    .bind(ot)
    .bind(tt)
    .bind(dur)
    .bind(tps)
    .bind(cost)
    .bind(cw)
    .bind(cup)
    .execute(pool)
    .await
    .map_err(|e| format!("Error insertando mensaje: {e}"))?;

    update_conversation_timestamp(pool, &msg.conversation_id, msg.created_at).await
}

pub async fn list_messages(
    pool: &SqlitePool,
    conversation_id: &str,
) -> Result<Vec<Message>, String> {
    let rows = sqlx::query(
        "SELECT id, conversation_id, role, content, provider, model,
                trace_id, chunks_used, nodes_used, tool_calls,
                COALESCE(sources_json, '[]') AS sources_json,
                research_sources, COALESCE(attachments_json, '[]') AS attachments_json, created_at,
                input_tokens, output_tokens, total_tokens, duration_ms,
                tokens_per_second, cost_usd, context_window, context_used_pct
         FROM messages
         WHERE conversation_id = ?
         ORDER BY created_at ASC",
    )
    .bind(conversation_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error listando mensajes: {e}"))?;

    rows.into_iter().map(row_to_message).collect()
}
