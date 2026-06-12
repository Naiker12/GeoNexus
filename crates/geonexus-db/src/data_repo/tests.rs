use crate::DataRepository;
use geonexus_core::{AssetKind, AssetStatus, CacheState, DataAsset, DocumentChunk, GraphEdge, GraphNode};
use sqlx::sqlite::SqlitePoolOptions;

async fn db_en_memoria() -> sqlx::SqlitePool {
    let pool = SqlitePoolOptions::new()
        .connect("sqlite::memory:")
        .await
        .unwrap();
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    pool
}

#[tokio::test]
async fn test_document_chunks_crud() {
    let pool = db_en_memoria().await;
    let repo = DataRepository { pool };

    // Insertar un asset de prueba primero (ya que los chunks tienen clave foránea a assets)
    let asset = DataAsset {
        id: "asset1".into(),
        project_id: "proj1".into(),
        workspace_id: Some("work1".into()),
        name: "test.pdf".into(),
        kind: AssetKind::Document,
        source: "local".into(),
        location: "/tmp/test.pdf".into(),
        agent_id: None,
        connector_id: None,
        status: AssetStatus::Pending,
        size_bytes: Some(100),
        chunks: 0,
        embeddings: 0,
        graph_nodes: 0,
        cache_state: CacheState::None,
        trace_id: None,
        created_at: 0,
        updated_at: 0,
    };
    repo.upsert_data_asset(&asset).await.unwrap();

    // Probar inserción de chunks
    let chunks = vec![
        DocumentChunk {
            id: "c1".into(),
            asset_id: "asset1".into(),
            chunk_index: 0,
            content: "hola mundo".into(),
            token_count: 2,
            page_number: Some(1),
            created_at: 100,
        },
        DocumentChunk {
            id: "c2".into(),
            asset_id: "asset1".into(),
            chunk_index: 1,
            content: "adios mundo".into(),
            token_count: 2,
            page_number: Some(2),
            created_at: 100,
        },
    ];
    repo.insert_document_chunks(&chunks).await.unwrap();

    // Probar listado
    let listed = repo.list_document_chunks("asset1").await.unwrap();
    assert_eq!(listed.len(), 2);
    assert_eq!(listed[0].id, "c1");
    assert_eq!(listed[1].content, "adios mundo");

    // Probar eliminación
    repo.delete_document_chunks("asset1").await.unwrap();
    let listed_after = repo.list_document_chunks("asset1").await.unwrap();
    assert!(listed_after.is_empty());
}

#[tokio::test]
async fn test_graph_nodes_and_edges_crud() {
    let pool = db_en_memoria().await;
    let repo = DataRepository { pool };

    let nodes = vec![
        GraphNode {
            id: "n1".into(),
            project_id: "proj1".into(),
            workspace_id: None,
            name: "Node 1".into(),
            kind: "concepto".into(),
            description: "Desc 1".into(),
            evidence: "Ev 1".into(),
            x: 10.0,
            y: 10.0,
            weight: 1,
            created_at: 100,
            source_event: "".into(),
            event_id: "".into(),
            icon: "".into(),
            is_ephemeral: false,
            source_asset_id: None,
            source_chat_id: None,
            origin_kind: "document".into(),
            pinned: false,
            deleted_at: None,
        },
        GraphNode {
            id: "n2".into(),
            project_id: "proj1".into(),
            workspace_id: None,
            name: "Node 2".into(),
            kind: "norma".into(),
            description: "Desc 2".into(),
            evidence: "Ev 2".into(),
            x: 20.0,
            y: 20.0,
            weight: 2,
            created_at: 100,
            source_event: "".into(),
            event_id: "".into(),
            icon: "".into(),
            is_ephemeral: false,
            source_asset_id: None,
            source_chat_id: None,
            origin_kind: "document".into(),
            pinned: false,
            deleted_at: None,
        },
    ];
    repo.insert_graph_nodes(&nodes).await.unwrap();

    let edges = vec![
        GraphEdge {
            id: "e1".into(),
            project_id: "proj1".into(),
            source: "n1".into(),
            target: "n2".into(),
            relation: "related".into(),
            strength: 75,
            created_at: 100,
        },
    ];
    repo.insert_graph_edges(&edges).await.unwrap();

    let listed_nodes = repo.list_graph_nodes("proj1").await.unwrap();
    assert_eq!(listed_nodes.len(), 2);

    let listed_edges = repo.list_graph_edges("proj1").await.unwrap();
    assert_eq!(listed_edges.len(), 1);
    assert_eq!(listed_edges[0].source, "n1");

    // Probar vaciado del grafo
    repo.clear_graph("proj1").await.unwrap();
    let listed_nodes_after = repo.list_graph_nodes("proj1").await.unwrap();
    assert!(listed_nodes_after.is_empty());
    let listed_edges_after = repo.list_graph_edges("proj1").await.unwrap();
    assert!(listed_edges_after.is_empty());
}
