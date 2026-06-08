use geonexus_core::chat::{Conversation, Message, MessageRole};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

pub async fn create_conversation(
    pool: &SqlitePool,
    project_id: &str,
    workspace_id: Option<&str>,
    provider: &str,
    model: &str,
) -> Result<Conversation, String> {
    let id = Uuid::new_v4().to_string();
    let now = unix_now();

    sqlx::query(
        "INSERT INTO conversations
            (id, project_id, workspace_id, title, provider, model, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(project_id)
    .bind(workspace_id)
    .bind(None::<String>)
    .bind(provider)
    .bind(model)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .map_err(|e| format!("Error creando conversacion: {e}"))?;

    Ok(Conversation {
        id,
        project_id: project_id.to_string(),
        workspace_id: workspace_id.map(ToOwned::to_owned),
        title: None,
        provider: provider.to_string(),
        model: model.to_string(),
        created_at: now,
        updated_at: now,
    })
}

pub async fn list_conversations(
    pool: &SqlitePool,
    project_id: &str,
) -> Result<Vec<Conversation>, String> {
    let rows = sqlx::query(
        "SELECT id, project_id, workspace_id, title, provider, model, created_at, updated_at
         FROM conversations
         WHERE project_id = ?
         ORDER BY updated_at DESC",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error listando conversaciones: {e}"))?;

    Ok(rows
        .into_iter()
        .map(|row| Conversation {
            id: row.get("id"),
            project_id: row.get("project_id"),
            workspace_id: row.get("workspace_id"),
            title: row.get("title"),
            provider: row.get("provider"),
            model: row.get("model"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
        .collect())
}

pub async fn insert_message(pool: &SqlitePool, msg: &Message) -> Result<(), String> {
    let role = serde_json::to_string(&msg.role)
        .map_err(|e| format!("Error serializando role: {e}"))?
        .trim_matches('"')
        .to_string();
    let chunks = serde_json::to_string(&msg.chunks_used).unwrap_or_else(|_| "[]".into());
    let nodes = serde_json::to_string(&msg.nodes_used).unwrap_or_else(|_| "[]".into());
    let tools = serde_json::to_string(&msg.tool_calls).unwrap_or_else(|_| "[]".into());

    sqlx::query(
        "INSERT INTO messages
            (id, conversation_id, role, content, provider, model,
             trace_id, chunks_used, nodes_used, tool_calls, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
    .bind(msg.created_at)
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
                trace_id, chunks_used, nodes_used, tool_calls, created_at
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

pub async fn update_conversation_title(
    pool: &SqlitePool,
    conversation_id: &str,
    title: &str,
) -> Result<(), String> {
    let now = unix_now();
    sqlx::query("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?")
        .bind(title.trim())
        .bind(now)
        .bind(conversation_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error actualizando titulo: {e}"))?;
    Ok(())
}

fn row_to_message(row: sqlx::sqlite::SqliteRow) -> Result<Message, String> {
    let role_raw: String = row.get("role");
    let role_json = format!("\"{role_raw}\"");
    let role: MessageRole =
        serde_json::from_str(&role_json).map_err(|e| format!("Role invalido: {e}"))?;

    let chunks_raw: Option<String> = row.get("chunks_used");
    let nodes_raw: Option<String> = row.get("nodes_used");
    let tools_raw: Option<String> = row.get("tool_calls");

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
        created_at: row.get("created_at"),
    })
}

async fn update_conversation_timestamp(
    pool: &SqlitePool,
    conversation_id: &str,
    updated_at: i64,
) -> Result<(), String> {
    sqlx::query("UPDATE conversations SET updated_at = ? WHERE id = ?")
        .bind(updated_at)
        .bind(conversation_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error actualizando conversacion: {e}"))?;
    Ok(())
}

fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
