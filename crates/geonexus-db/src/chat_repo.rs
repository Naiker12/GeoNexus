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
        message_count: Some(0),
    })
}

pub async fn list_conversations(
    pool: &SqlitePool,
    project_id: &str,
) -> Result<Vec<Conversation>, String> {
    let rows = sqlx::query(
        "SELECT c.id, c.project_id, c.workspace_id, c.title, c.provider, c.model,
                c.created_at, c.updated_at,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count
         FROM conversations c
         WHERE c.project_id = ?
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
    let sources = serde_json::to_string(&msg.sources).unwrap_or_else(|_| "[]".into());

    sqlx::query(
        "INSERT INTO messages
            (id, conversation_id, role, content, provider, model,
             trace_id, chunks_used, nodes_used, tool_calls, sources_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
                trace_id, chunks_used, nodes_used, tool_calls,
                COALESCE(sources_json, '[]') AS sources_json, created_at
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

fn row_to_message(row: sqlx::sqlite::SqliteRow) -> Result<Message, String> {
    let role_raw: String = row.get("role");
    let role_json = format!("\"{role_raw}\"");
    let role: MessageRole =
        serde_json::from_str(&role_json).map_err(|e| format!("Role invalido: {e}"))?;

    let chunks_raw: Option<String> = row.get("chunks_used");
    let nodes_raw: Option<String> = row.get("nodes_used");
    let tools_raw: Option<String> = row.get("tool_calls");
    let sources_raw: Option<String> = row.get("sources_json");

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

#[cfg(test)]
mod tests {
    use super::*;
    use geonexus_core::chat::MessageRole;

    async fn db_en_memoria() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("crear pool en memoria");
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("ejecutar migraciones");
        pool
    }

    fn msg(conversation_id: &str, role: MessageRole, content: &str) -> Message {
        Message {
            id: Uuid::new_v4().to_string(),
            conversation_id: conversation_id.to_string(),
            role,
            content: content.to_string(),
            provider: Some("ollama".into()),
            model: Some("llama3.1".into()),
            trace_id: "trace-test".into(),
            chunks_used: vec![],
            nodes_used: vec![],
            tool_calls: vec![],
            sources: vec![],
            created_at: 1_000_000,
        }
    }

    #[tokio::test]
    async fn crear_y_listar_conversacion() {
        let pool = db_en_memoria().await;
        let conv = create_conversation(&pool, "proj-1", None, "ollama", "llama3.1")
            .await
            .unwrap();

        assert_eq!(conv.project_id, "proj-1");
        assert_eq!(conv.provider, "ollama");
        assert_eq!(conv.message_count, Some(0));

        let list = list_conversations(&pool, "proj-1").await.unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, conv.id);
    }

    #[tokio::test]
    async fn listar_conversaciones_solo_del_proyecto() {
        let pool = db_en_memoria().await;
        create_conversation(&pool, "proj-1", None, "ollama", "llama3.1")
            .await
            .unwrap();
        create_conversation(&pool, "proj-2", None, "openai", "gpt-4")
            .await
            .unwrap();

        let list = list_conversations(&pool, "proj-1").await.unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].provider, "ollama");
    }

    #[tokio::test]
    async fn insertar_y_listar_mensajes() {
        let pool = db_en_memoria().await;
        let conv = create_conversation(&pool, "proj-1", None, "ollama", "llama3.1")
            .await
            .unwrap();

        let m1 = msg(&conv.id, MessageRole::User, "Hola");
        let m2 = msg(&conv.id, MessageRole::Assistant, "Hola, como ayudarte?");
        insert_message(&pool, &m1).await.unwrap();
        insert_message(&pool, &m2).await.unwrap();

        let msgs = list_messages(&pool, &conv.id).await.unwrap();
        assert_eq!(msgs.len(), 2);
        assert_eq!(msgs[0].role, MessageRole::User);
        assert_eq!(msgs[0].content, "Hola");
        assert_eq!(msgs[1].role, MessageRole::Assistant);
    }

    #[tokio::test]
    async fn mensajes_ordenados_por_created_at() {
        let pool = db_en_memoria().await;
        let conv = create_conversation(&pool, "proj-1", None, "ollama", "llama3.1")
            .await
            .unwrap();

        let mut m1 = msg(&conv.id, MessageRole::User, "Primero");
        m1.created_at = 100;
        let mut m2 = msg(&conv.id, MessageRole::Assistant, "Segundo");
        m2.created_at = 200;
        let mut m3 = msg(&conv.id, MessageRole::User, "Tercero");
        m3.created_at = 300;

        insert_message(&pool, &m3).await.unwrap();
        insert_message(&pool, &m1).await.unwrap();
        insert_message(&pool, &m2).await.unwrap();

        let msgs = list_messages(&pool, &conv.id).await.unwrap();
        assert_eq!(msgs[0].content, "Primero");
        assert_eq!(msgs[1].content, "Segundo");
        assert_eq!(msgs[2].content, "Tercero");
    }

    #[tokio::test]
    async fn actualizar_titulo_conversacion() {
        let pool = db_en_memoria().await;
        let conv = create_conversation(&pool, "proj-1", None, "ollama", "llama3.1")
            .await
            .unwrap();

        update_conversation_title(&pool, &conv.id, "Nuevo titulo")
            .await
            .unwrap();

        let list = list_conversations(&pool, "proj-1").await.unwrap();
        assert_eq!(list[0].title.as_deref(), Some("Nuevo titulo"));
    }

    #[tokio::test]
    async fn mensaje_con_sources_persiste_y_carga() {
        let pool = db_en_memoria().await;
        let conv = create_conversation(&pool, "proj-1", None, "ollama", "llama3.1")
            .await
            .unwrap();

        let mut m = msg(&conv.id, MessageRole::Assistant, "Respuesta con fuentes");
        m.sources = vec!["doc1.pdf".into(), "capa-uso-suelo.geojson".into()];
        insert_message(&pool, &m).await.unwrap();

        let msgs = list_messages(&pool, &conv.id).await.unwrap();
        assert_eq!(msgs[0].sources.len(), 2);
        assert_eq!(msgs[0].sources[0], "doc1.pdf");
        assert_eq!(msgs[0].sources[1], "capa-uso-suelo.geojson");
    }

    #[tokio::test]
    async fn mensaje_sin_sources_carga_con_array_vacio() {
        let pool = db_en_memoria().await;
        let conv = create_conversation(&pool, "proj-1", None, "ollama", "llama3.1")
            .await
            .unwrap();

        let m = msg(&conv.id, MessageRole::User, "Sin fuentes");
        insert_message(&pool, &m).await.unwrap();

        let msgs = list_messages(&pool, &conv.id).await.unwrap();
        assert_eq!(msgs[0].sources.len(), 0);
    }

    #[tokio::test]
    async fn message_count_refleja_cantidad_de_mensajes() {
        let pool = db_en_memoria().await;
        let conv = create_conversation(&pool, "proj-1", None, "ollama", "llama3.1")
            .await
            .unwrap();

        let list0 = list_conversations(&pool, "proj-1").await.unwrap();
        assert_eq!(list0[0].message_count, Some(0));

        insert_message(&pool, &msg(&conv.id, MessageRole::User, "1")).await.unwrap();
        let list1 = list_conversations(&pool, "proj-1").await.unwrap();
        assert_eq!(list1[0].message_count, Some(1));

        insert_message(&pool, &msg(&conv.id, MessageRole::Assistant, "2")).await.unwrap();
        let list2 = list_conversations(&pool, "proj-1").await.unwrap();
        assert_eq!(list2[0].message_count, Some(2));
    }
}
