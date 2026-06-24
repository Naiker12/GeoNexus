use sqlx::{SqlitePool, Row};
use geonexus_core::chat::{Conversation, ConversationSearchResult};
use uuid::Uuid;
use crate::chat_repo::unix_now;

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

    let conv = Conversation {
        id: id.clone(),
        project_id: project_id.to_string(),
        workspace_id: workspace_id.map(ToOwned::to_owned),
        title: None,
        provider: provider.to_string(),
        model: model.to_string(),
        created_at: now,
        updated_at: now,
        message_count: Some(0),
        archived_at: None,
    };

    let _ = reindex_conversation_fts(pool, &id).await;

    Ok(conv)
}

pub async fn list_conversations(
    pool: &SqlitePool,
    project_id: &str,
) -> Result<Vec<Conversation>, String> {
    let rows = sqlx::query(
        "SELECT c.id, c.project_id, c.workspace_id, c.title, c.provider, c.model,
                c.created_at, c.updated_at, c.archived_at,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
         FROM conversations c
         WHERE c.project_id = ? AND c.archived_at IS NULL
         ORDER BY c.updated_at DESC",
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
            message_count: row.get("message_count"),
            archived_at: row.get("archived_at"),
        })
        .collect())
}

pub async fn list_archived_conversations(
    pool: &SqlitePool,
    project_id: &str,
) -> Result<Vec<Conversation>, String> {
    let rows = sqlx::query(
        "SELECT c.id, c.project_id, c.workspace_id, c.title, c.provider, c.model,
                c.created_at, c.updated_at, c.archived_at,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
         FROM conversations c
         WHERE c.project_id = ? AND c.archived_at IS NOT NULL
         ORDER BY c.archived_at DESC",
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error listando conversaciones archivadas: {e}"))?;

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
            message_count: row.get("message_count"),
            archived_at: row.get("archived_at"),
        })
        .collect())
}

pub async fn archive_conversation(
    pool: &SqlitePool,
    conversation_id: &str,
) -> Result<(), String> {
    let now = unix_now();
    let rows = sqlx::query("UPDATE conversations SET archived_at = ? WHERE id = ?")
        .bind(now)
        .bind(conversation_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error archivando conversacion: {e}"))?;
    if rows.rows_affected() == 0 {
        return Err("Conversacion no encontrada".into());
    }
    Ok(())
}

pub async fn unarchive_conversation(
    pool: &SqlitePool,
    conversation_id: &str,
) -> Result<(), String> {
    let rows = sqlx::query("UPDATE conversations SET archived_at = NULL WHERE id = ?")
        .bind(conversation_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error desarchivando conversacion: {e}"))?;
    if rows.rows_affected() == 0 {
        return Err("Conversacion no encontrada".into());
    }
    Ok(())
}

pub async fn search_conversations(
    pool: &SqlitePool,
    project_id: &str,
    query: &str,
    limit: i64,
) -> Result<Vec<ConversationSearchResult>, String> {
    let rows = sqlx::query(
        "SELECT fts.conversation_id, c.title, c.updated_at, c.archived_at,
                snippet(conversations_fts, 2, '<mark>', '</mark>', '...', 32) AS snippet,
                rank
         FROM conversations_fts fts
         JOIN conversations c ON c.id = fts.conversation_id
         WHERE conversations_fts MATCH ?1 AND c.project_id = ?2
         ORDER BY rank
         LIMIT ?3",
    )
    .bind(query)
    .bind(project_id)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error buscando conversaciones: {e}"))?;

    Ok(rows
        .into_iter()
        .map(|row| ConversationSearchResult {
            conversation_id: row.get("conversation_id"),
            title: row.get("title"),
            snippet: row.get("snippet"),
            rank: row.get("rank"),
            updated_at: row.get("updated_at"),
            archived_at: row.get("archived_at"),
        })
        .collect())
}

pub async fn reindex_conversation_fts(
    pool: &SqlitePool,
    conversation_id: &str,
) -> Result<(), String> {
    let title: Option<String> = sqlx::query_scalar(
        "SELECT title FROM conversations WHERE id = ?"
    )
    .bind(conversation_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Error consultando conversacion: {e}"))?
    .flatten();

    let content: String = sqlx::query_scalar(
        "SELECT COALESCE(GROUP_CONCAT(m.content, ' '), '')
         FROM messages m
         WHERE m.conversation_id = ?
         ORDER BY m.created_at ASC"
    )
    .bind(conversation_id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Error consultando mensajes: {e}"))?;

    sqlx::query(
        "INSERT OR REPLACE INTO conversations_fts(conversation_id, title, content)
         VALUES (?, ?, ?)"
    )
    .bind(conversation_id)
    .bind(title.unwrap_or_default())
    .bind(&content)
    .execute(pool)
    .await
    .map_err(|e| format!("Error reindexando FTS: {e}"))?;

    Ok(())
}

pub async fn delete_conversation(
    pool: &SqlitePool,
    conversation_id: &str,
) -> Result<(), String> {
    sqlx::query("DELETE FROM messages WHERE conversation_id = ?")
        .bind(conversation_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error eliminando mensajes: {e}"))?;

    sqlx::query("DELETE FROM conversations WHERE id = ?")
        .bind(conversation_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error eliminando conversacion: {e}"))?;

    Ok(())
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

pub(crate) async fn update_conversation_timestamp(
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
