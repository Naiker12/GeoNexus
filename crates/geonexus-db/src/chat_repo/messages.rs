use sqlx::SqlitePool;
use geonexus_core::chat::Message;
use crate::chat_repo::{row_to_message, conversations::{update_conversation_timestamp, reindex_conversation_fts}};

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
    let reasoning_events_ser = msg.reasoning_events
        .as_ref()
        .and_then(|e| serde_json::to_string(e).ok());
    let reasoning_content_val = msg.reasoning_content.clone();
    let reasoning_duration_ms_val = msg.reasoning_duration_ms.clone();

    let (it, ot, tt, dur, tps, cost, cw, cup) = if let Some(ref s) = msg.stats {
        (Some(s.input_tokens as i64), Some(s.output_tokens as i64), Some(s.total_tokens as i64),
         Some(s.duration_ms as i64), Some(s.tokens_per_second as f64), Some(s.cost_usd),
         Some(s.context_window as i64), Some(s.context_used_pct as f64))
    } else {
        (None, None, None, None, None, None, None, None)
    };

    // Check if reasoning_content and reasoning_duration_ms columns exist
    let has_reasoning_content: bool = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('messages') WHERE name = 'reasoning_content'"
    )
    .fetch_optional(pool)
    .await
    .map(|x| x.flatten().is_some())
    .unwrap_or(false);

    let has_reasoning_duration_ms: bool = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('messages') WHERE name = 'reasoning_duration_ms'"
    )
    .fetch_optional(pool)
    .await
    .map(|x| x.flatten().is_some())
    .unwrap_or(false);

    if has_reasoning_content && has_reasoning_duration_ms {
        sqlx::query(
            "INSERT INTO messages
                (id, conversation_id, role, content, provider, model,
                 trace_id, chunks_used, nodes_used, tool_calls, sources_json, research_sources, attachments_json, reasoning_events, reasoning_content, reasoning_duration_ms, created_at,
                 input_tokens, output_tokens, total_tokens, duration_ms,
                 tokens_per_second, cost_usd, context_window, context_used_pct)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
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
        .bind(&reasoning_events_ser)
        .bind(&reasoning_content_val)
        .bind(&reasoning_duration_ms_val)
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
    } else if has_reasoning_content {
        sqlx::query(
            "INSERT INTO messages
                (id, conversation_id, role, content, provider, model,
                 trace_id, chunks_used, nodes_used, tool_calls, sources_json, research_sources, attachments_json, reasoning_events, reasoning_content, created_at,
                 input_tokens, output_tokens, total_tokens, duration_ms,
                 tokens_per_second, cost_usd, context_window, context_used_pct)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
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
        .bind(&reasoning_events_ser)
        .bind(&reasoning_content_val)
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
    } else {
        sqlx::query(
            "INSERT INTO messages
                (id, conversation_id, role, content, provider, model,
                 trace_id, chunks_used, nodes_used, tool_calls, sources_json, research_sources, attachments_json, reasoning_events, created_at,
                 input_tokens, output_tokens, total_tokens, duration_ms,
                 tokens_per_second, cost_usd, context_window, context_used_pct)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
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
        .bind(&reasoning_events_ser)
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
    }

    update_conversation_timestamp(pool, &msg.conversation_id, msg.created_at).await?;
    reindex_conversation_fts(pool, &msg.conversation_id).await?;
    let role_str = serde_json::to_string(&msg.role)
        .unwrap_or_default()
        .trim_matches('"')
        .to_string();
    reindex_message_fts(pool, &msg.id, &msg.conversation_id, &role_str, &msg.content).await
}

pub async fn reindex_message_fts(
    pool: &SqlitePool,
    message_id: &str,
    conversation_id: &str,
    role: &str,
    content: &str,
) -> Result<(), String> {
    let role_str = serde_json::to_string(role)
        .map_err(|e| format!("Error serializando role: {e}"))?
        .trim_matches('"')
        .to_string();

    sqlx::query(
        "INSERT OR REPLACE INTO messages_fts(message_id, conversation_id, role, content)
         VALUES (?, ?, ?, ?)"
    )
    .bind(message_id)
    .bind(conversation_id)
    .bind(&role_str)
    .bind(content)
    .execute(pool)
    .await
    .map_err(|e| format!("Error reindexando mensaje FTS: {e}"))?;

    Ok(())
}

pub async fn search_messages_fts(
    pool: &SqlitePool,
    query: &str,
    project_id: &str,
    limit: i64,
) -> Result<Vec<geonexus_core::chat::MessageSearchResult>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }

    let sanitized = query.trim().replace(|c: char| c.is_ascii_punctuation() && c != '\'', " ");
    let fts_query = format!("\"{}\"", sanitized.replace('"', ""));

    let rows = sqlx::query(
        "SELECT fts.message_id, fts.conversation_id, fts.role,
                snippet(messages_fts, 0, '<mark>', '</mark>', '...', 32) AS snippet,
                rank, m.created_at
         FROM messages_fts fts
         JOIN messages m ON m.id = fts.message_id
         JOIN conversations c ON c.id = fts.conversation_id
         WHERE messages_fts MATCH ?1 AND c.project_id = ?2
         ORDER BY rank
         LIMIT ?3",
    )
    .bind(&fts_query)
    .bind(project_id)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error buscando mensajes FTS: {e}"))?;

    let results: Vec<geonexus_core::chat::MessageSearchResult> = rows
        .into_iter()
        .map(|row| {
            use sqlx::Row;
            geonexus_core::chat::MessageSearchResult {
                message_id: row.get("message_id"),
                conversation_id: row.get("conversation_id"),
                role: row.get("role"),
                snippet: row.get("snippet"),
                rank: row.get("rank"),
                created_at: row.get("created_at"),
            }
        })
        .collect();

    Ok(results)
}

pub async fn list_messages(
    pool: &SqlitePool,
    conversation_id: &str,
) -> Result<Vec<Message>, String> {
    // First check if reasoning_content and reasoning_duration_ms columns exist
    let has_reasoning_content: bool = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('messages') WHERE name = 'reasoning_content'"
    )
    .fetch_optional(pool)
    .await
    .map(|x| x.flatten().is_some())
    .unwrap_or(false);

    let has_reasoning_duration_ms: bool = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('messages') WHERE name = 'reasoning_duration_ms'"
    )
    .fetch_optional(pool)
    .await
    .map(|x| x.flatten().is_some())
    .unwrap_or(false);

    let rows = if has_reasoning_content && has_reasoning_duration_ms {
        sqlx::query(
            "SELECT id, conversation_id, role, content, provider, model,
                    trace_id, chunks_used, nodes_used, tool_calls,
                    COALESCE(sources_json, '[]') AS sources_json,
                    research_sources, COALESCE(attachments_json, '[]') AS attachments_json, reasoning_events, reasoning_content, reasoning_duration_ms, created_at,
                    input_tokens, output_tokens, total_tokens, duration_ms,
                    tokens_per_second, cost_usd, context_window, context_used_pct
             FROM messages
             WHERE conversation_id = ?
             ORDER BY created_at ASC",
        )
        .bind(conversation_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error listando mensajes: {e}"))?
    } else if has_reasoning_content {
        sqlx::query(
            "SELECT id, conversation_id, role, content, provider, model,
                    trace_id, chunks_used, nodes_used, tool_calls,
                    COALESCE(sources_json, '[]') AS sources_json,
                    research_sources, COALESCE(attachments_json, '[]') AS attachments_json, reasoning_events, reasoning_content, created_at,
                    input_tokens, output_tokens, total_tokens, duration_ms,
                    tokens_per_second, cost_usd, context_window, context_used_pct
             FROM messages
             WHERE conversation_id = ?
             ORDER BY created_at ASC",
        )
        .bind(conversation_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error listando mensajes: {e}"))?
    } else {
        sqlx::query(
            "SELECT id, conversation_id, role, content, provider, model,
                    trace_id, chunks_used, nodes_used, tool_calls,
                    COALESCE(sources_json, '[]') AS sources_json,
                    research_sources, COALESCE(attachments_json, '[]') AS attachments_json, reasoning_events, created_at,
                    input_tokens, output_tokens, total_tokens, duration_ms,
                    tokens_per_second, cost_usd, context_window, context_used_pct
             FROM messages
             WHERE conversation_id = ?
             ORDER BY created_at ASC",
        )
        .bind(conversation_id)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error listando mensajes: {e}"))?
    };

    rows.into_iter().map(row_to_message).collect()
}
