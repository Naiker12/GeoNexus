use super::conversations::{create_conversation, list_conversations, update_conversation_title};
use super::messages::{insert_message, list_messages};
use geonexus_core::chat::{Message, MessageRole};
use sqlx::SqlitePool;
use uuid::Uuid;

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
        research_sources: None,
        stats: None,
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
