#[cfg(test)]
mod tests {
    use crate::types::asset::{AssetKind, AssetStatus, AssetValidation, CacheState, DataStoreMetrics};
    use crate::types::graph::{GraphEdge, GraphNode};
    use crate::types::sync::{SyncEvent, SyncEventType};
    use crate::types::chunk::DocumentChunk;

    #[test]
    fn asset_status_serializes_snake_case() {
        let cases = [
            (AssetStatus::Pending, r#""pending""#),
            (AssetStatus::Indexing, r#""indexing""#),
            (AssetStatus::Ready, r#""ready""#),
            (AssetStatus::Conflict, r#""conflict""#),
            (AssetStatus::Error, r#""error""#),
        ];
        for (status, expected) in cases {
            assert_eq!(serde_json::to_string(&status).unwrap(), expected);
        }
    }

    #[test]
    fn cache_state_serializes_snake_case() {
        let cases = [
            (CacheState::None, r#""none""#),
            (CacheState::Partial, r#""partial""#),
            (CacheState::Cached, r#""cached""#),
            (CacheState::Stale, r#""stale""#),
        ];
        for (state, expected) in cases {
            assert_eq!(serde_json::to_string(&state).unwrap(), expected);
        }
    }

    #[test]
    fn asset_kind_serializes_snake_case() {
        let cases = [
            (AssetKind::Document, r#""document""#),
            (AssetKind::Layer, r#""layer""#),
            (AssetKind::Shapefile, r#""shapefile""#),
            (AssetKind::Csv, r#""csv""#),
            (AssetKind::Raster, r#""raster""#),
            (AssetKind::Word, r#""word""#),
            (AssetKind::Excel, r#""excel""#),
            (AssetKind::Output, r#""output""#),
            (AssetKind::Other, r#""other""#),
        ];
        for (kind, expected) in cases {
            assert_eq!(serde_json::to_string(&kind).unwrap(), expected);
        }
    }

    #[test]
    fn sync_event_type_serializes_snake_case() {
        let cases = [
            (SyncEventType::Discovered, r#""discovered""#),
            (SyncEventType::Downloaded, r#""downloaded""#),
            (SyncEventType::Indexed, r#""indexed""#),
            (SyncEventType::Embedded, r#""embedded""#),
            (SyncEventType::GraphLinked, r#""graph_linked""#),
            (SyncEventType::Conflict, r#""conflict""#),
            (SyncEventType::Error, r#""error""#),
            (SyncEventType::ConversationSaved, r#""conversation_saved""#),
        ];
        for (event_type, expected) in cases {
            assert_eq!(serde_json::to_string(&event_type).unwrap(), expected);
        }
    }

    #[test]
    fn validation_is_ready_when_all_checks_pass() {
        let v = AssetValidation::new("a1".into(), true, true, true, true, true, vec![]);
        assert!(v.is_ready);
        assert!(v.issues.is_empty());
    }

    #[test]
    fn validation_not_ready_if_any_check_fails() {
        let combos = [
            (false, true, true, true, true),
            (true, false, true, true, true),
            (true, true, false, true, true),
            (true, true, true, false, true),
            (true, true, true, true, false),
        ];
        for (fe, pa, mo, cv, ce) in combos {
            let v = AssetValidation::new("a".into(), fe, pa, mo, cv, ce, vec![]);
            assert!(
                !v.is_ready,
                "should be false with fe={fe} pa={pa} mo={mo} cv={cv} ce={ce}"
            );
        }
    }

    #[test]
    fn validation_accumulates_issues() {
        let issues = vec!["falta cache".into(), "sin chunks".into()];
        let v =
            AssetValidation::new("a2".into(), true, true, true, false, false, issues.clone());
        assert_eq!(v.issues.len(), 2);
        assert!(!v.is_ready);
    }

    #[test]
    fn data_store_metrics_roundtrip_json() {
        let m = DataStoreMetrics {
            project_id: "p1".into(),
            total_assets: 10,
            assets_ready: 7,
            assets_pending: 2,
            assets_error: 1,
            total_chunks: 150,
            total_embeddings: 150,
            total_graph_nodes: 30,
            cache_size_bytes: 1024 * 1024,
        };
        let json = serde_json::to_string(&m).unwrap();
        let de: DataStoreMetrics = serde_json::from_str(&json).unwrap();
        assert_eq!(de.project_id, m.project_id);
        assert_eq!(de.total_assets, m.total_assets);
        assert_eq!(de.cache_size_bytes, m.cache_size_bytes);
    }

    #[test]
    fn data_asset_roundtrip_json() {
        use crate::types::asset::DataAsset;
        let a = DataAsset {
            id: "a1".into(),
            project_id: "p1".into(),
            workspace_id: Some("w1".into()),
            name: "test.geojson".into(),
            kind: AssetKind::Layer,
            source: "local".into(),
            location: "/tmp/test.geojson".into(),
            agent_id: Some("ag1".into()),
            connector_id: Some("c1".into()),
            status: AssetStatus::Ready,
            size_bytes: Some(42_000_000),
            chunks: 118,
            embeddings: 118,
            graph_nodes: 24,
            cache_state: CacheState::Cached,
            trace_id: Some("tr1".into()),
            created_at: 1700000000,
            updated_at: 1700000000,
        };
        let json = serde_json::to_string(&a).unwrap();
        let de: DataAsset = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, "a1");
        assert_eq!(de.kind, AssetKind::Layer);
        assert_eq!(de.status, AssetStatus::Ready);
        assert_eq!(de.size_bytes, Some(42_000_000));
        assert_eq!(de.workspace_id, Some("w1".into()));
        assert_eq!(de.agent_id, Some("ag1".into()));
        assert_eq!(de.connector_id, Some("c1".into()));
        assert_eq!(de.trace_id, Some("tr1".into()));
    }

    #[test]
    fn sync_event_roundtrip_json() {
        let e = SyncEvent {
            id: "ev1".into(),
            project_id: "p1".into(),
            workspace_id: Some("w1".into()),
            connector_id: Some("c1".into()),
            asset_id: Some("a1".into()),
            agent_id: Some("ag1".into()),
            event_type: SyncEventType::Discovered,
            detail: Some("encontrado".into()),
            trace_id: None,
            created_at: 1700000000,
        };
        let json = serde_json::to_string(&e).unwrap();
        let de: SyncEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(de.event_type, SyncEventType::Discovered);
        assert_eq!(de.connector_id, Some("c1".into()));
        assert_eq!(de.workspace_id, Some("w1".into()));
        assert_eq!(de.agent_id, Some("ag1".into()));
        assert!(de.trace_id.is_none());
    }

    #[test]
    fn document_chunk_roundtrip_json() {
        let c = DocumentChunk {
            id: "c1".into(),
            asset_id: "a1".into(),
            chunk_index: 0,
            content: "contenido de prueba".into(),
            token_count: 3,
            page_number: Some(1),
            created_at: 1700000000,
        };
        let json = serde_json::to_string(&c).unwrap();
        let de: DocumentChunk = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, c.id);
        assert_eq!(de.asset_id, c.asset_id);
        assert_eq!(de.content, c.content);
        assert_eq!(de.page_number, Some(1));
    }

    #[test]
    fn graph_node_roundtrip_json() {
        let n = GraphNode {
            id: "node1".into(),
            project_id: "p1".into(),
            workspace_id: Some("w1".into()),
            name: "Art. 142".into(),
            kind: "norma".into(),
            description: "Restricción de altura".into(),
            evidence: "POT / pág 3".into(),
            x: 10.0,
            y: 20.0,
            weight: 3,
            created_at: 1700000000,
            source_event: "chat".into(),
            event_id: "conv-1".into(),
            icon: "".into(),
            is_ephemeral: false,
            source_asset_id: None,
            source_chat_id: None,
            origin_kind: "document".into(),
            pinned: false,
            deleted_at: None,
            use_count: 0,
            last_used_at: None,
            memory_score: 0.0,
        };
        let json = serde_json::to_string(&n).unwrap();
        let de: GraphNode = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, n.id);
        assert_eq!(de.name, n.name);
        assert_eq!(de.x, 10.0);
        assert_eq!(de.source_event, "chat");
        assert_eq!(de.is_ephemeral, false);
    }

    #[test]
    fn graph_edge_roundtrip_json() {
        let e = GraphEdge {
            id: "edge1".into(),
            project_id: "p1".into(),
            source: "node1".into(),
            target: "node2".into(),
            relation: "limita".into(),
            strength: 90,
            created_at: 1700000000,
        };
        let json = serde_json::to_string(&e).unwrap();
        let de: GraphEdge = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, e.id);
        assert_eq!(de.source, e.source);
        assert_eq!(de.relation, e.relation);
        assert_eq!(de.strength, 90);
    }
}
