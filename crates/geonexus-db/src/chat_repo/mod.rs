use geonexus_core::chat::{FileAttachment, Message, MessageRole};
use sqlx::Row;

pub mod conversations;
pub mod messages;

pub use conversations::{
    create_conversation, list_conversations, list_archived_conversations,
    delete_conversation, update_conversation_title,
    archive_conversation, unarchive_conversation,
    search_conversations, reindex_conversation_fts,
};
pub use messages::{insert_message, list_messages};

#[cfg(test)]
mod tests;

pub(crate) fn row_to_message(row: sqlx::sqlite::SqliteRow) -> Result<Message, String> {
    let role_raw: String = row.get("role");
    let role_json = format!("\"{role_raw}\"");
    let role: MessageRole =
        serde_json::from_str(&role_json).map_err(|e| format!("Role invalido: {e}"))?;

    let chunks_raw: Option<String> = row.get("chunks_used");
    let nodes_raw: Option<String> = row.get("nodes_used");
    let tools_raw: Option<String> = row.get("tool_calls");
    let sources_raw: Option<String> = row.get("sources_json");
    let research_raw: Option<String> = row.get("research_sources");
    let attachments_raw: Option<String> = row.get("attachments_json");
    let reasoning_events_raw: Option<String> = row.get("reasoning_events");
    let reasoning_content: Option<String> = row.try_get("reasoning_content").unwrap_or_default();
    let reasoning_duration_ms: Option<i64> = row.try_get("reasoning_duration_ms").unwrap_or_default();
    let research: Vec<geonexus_core::chat::ResearchSource> =
        serde_json::from_str(research_raw.as_deref().unwrap_or("[]"))
            .unwrap_or_default();
    let attachments: Vec<FileAttachment> = 
        serde_json::from_str(attachments_raw.as_deref().unwrap_or("[]"))
            .unwrap_or_default();
    let reasoning_events: Option<Vec<serde_json::Value>> =
        reasoning_events_raw.and_then(|s| serde_json::from_str(&s).ok());

    let it: Option<i64> = row.get("input_tokens");
    let stats = it.map(|_| geonexus_core::chat::MessageStats {
        input_tokens: row.get::<Option<i64>, _>("input_tokens").unwrap_or(0) as u32,
        output_tokens: row.get::<Option<i64>, _>("output_tokens").unwrap_or(0) as u32,
        total_tokens: row.get::<Option<i64>, _>("total_tokens").unwrap_or(0) as u32,
        duration_ms: row.get::<Option<i64>, _>("duration_ms").unwrap_or(0) as u64,
        tokens_per_second: row.get::<Option<f64>, _>("tokens_per_second").unwrap_or(0.0) as f32,
        cost_usd: row.get::<Option<f64>, _>("cost_usd").unwrap_or(0.0),
        context_window: row.get::<Option<i64>, _>("context_window").unwrap_or(0) as u32,
        context_used_pct: row.get::<Option<f64>, _>("context_used_pct").unwrap_or(0.0) as f32,
    });

    Ok(Message {
        id: row.get("id"),
        conversation_id: row.get("conversation_id"),
        role,
        content: row.get("content"),
        provider: row.get("provider"),
        model: row.get("model"),
        trace_id: row.get::<String, _>("trace_id"),
        chunks_used: serde_json::from_str(chunks_raw.as_deref().unwrap_or("[]"))
            .unwrap_or_default(),
        nodes_used: serde_json::from_str(nodes_raw.as_deref().unwrap_or("[]"))
            .unwrap_or_default(),
        tool_calls: serde_json::from_str(tools_raw.as_deref().unwrap_or("[]"))
            .unwrap_or_default(),
        sources: serde_json::from_str(sources_raw.as_deref().unwrap_or("[]"))
            .unwrap_or_default(),
        created_at: row.get("created_at"),
        research_sources: if research.is_empty() { None } else { Some(research) },
        stats,
        attachments,
        reasoning_events,
        reasoning_content,
        reasoning_duration_ms,
    })
}

pub(crate) fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
