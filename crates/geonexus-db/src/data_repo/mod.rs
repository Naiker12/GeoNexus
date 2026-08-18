use sqlx::SqlitePool;
use geonexus_core::{
    AssetKind, AssetStatus, CacheState, DataAsset, DocumentChunk, GraphEdge, GraphNode, SyncEvent,
    SyncEventType,
};

pub mod init;
pub mod assets;
pub mod chunks;
pub mod graph;
pub mod metrics;

#[cfg(test)]
mod tests;

/// Repositorio de datos asíncrono con SQLite y sqlx.
#[derive(Debug, Clone)]
pub struct DataRepository {
    pub pool: SqlitePool,
}

// ─── Helpers de parsing de base de datos ─────────────────────────────────────

pub(crate) fn parse_kind(s: &str) -> AssetKind {
    serde_json::from_str(&format!("\"{s}\"")).unwrap_or(AssetKind::Other)
}

pub(crate) fn parse_status(s: &str) -> AssetStatus {
    serde_json::from_str(&format!("\"{s}\"")).unwrap_or(AssetStatus::Error)
}

pub(crate) fn parse_cache(s: &str) -> CacheState {
    serde_json::from_str(&format!("\"{s}\"")).unwrap_or(CacheState::None)
}

pub(crate) fn parse_event_type(s: &str) -> SyncEventType {
    serde_json::from_str(&format!("\"{s}\"")).unwrap_or(SyncEventType::Error)
}

pub(crate) fn to_str<T: serde::Serialize>(val: &T) -> String {
    let s = serde_json::to_string(val).unwrap_or_default();
    s.trim_matches('"').to_string()
}

pub(crate) fn row_to_asset(row: &sqlx::sqlite::SqliteRow) -> Result<DataAsset, String> {
    use sqlx::Row;
    let kind_str: String = row.get("kind");
    let status_str: String = row.get("status");
    let cache_str: String = row.get("cache_state");

    Ok(DataAsset {
        id: row.get("id"),
        project_id: row.get("project_id"),
        workspace_id: row.get("workspace_id"),
        name: row.get("name"),
        kind: parse_kind(&kind_str),
        source: row.get("source"),
        location: row.get("location"),
        agent_id: row.get("agent_id"),
        connector_id: row.get("connector_id"),
        status: parse_status(&status_str),
        size_bytes: row.get("size_bytes"),
        chunks: row.get("chunks"),
        embeddings: row.get("embeddings"),
        graph_nodes: row.get("graph_nodes"),
        cache_state: parse_cache(&cache_str),
        trace_id: row.get("trace_id"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

pub(crate) fn row_to_event(row: &sqlx::sqlite::SqliteRow) -> Result<SyncEvent, String> {
    use sqlx::Row;
    let type_str: String = row.get("event_type");

    Ok(SyncEvent {
        id: row.get("id"),
        project_id: row.get("project_id"),
        workspace_id: row.get("workspace_id"),
        connector_id: row.get("connector_id"),
        asset_id: row.get("asset_id"),
        agent_id: row.get("agent_id"),
        event_type: parse_event_type(&type_str),
        detail: row.get("detail"),
        trace_id: row.get("trace_id"),
        created_at: row.get("created_at"),
    })
}

pub(crate) fn row_to_chunk(row: &sqlx::sqlite::SqliteRow) -> Result<DocumentChunk, String> {
    use sqlx::Row;
    Ok(DocumentChunk {
        id: row.get("id"),
        asset_id: row.get("asset_id"),
        chunk_index: row.get("chunk_index"),
        content: row.get("content"),
        token_count: row.get("token_count"),
        page_number: row.get("page_number"),
        created_at: row.get("created_at"),
    })
}

pub(crate) fn row_to_node(row: &sqlx::sqlite::SqliteRow) -> Result<GraphNode, String> {
    use sqlx::Row;
    Ok(GraphNode {
        id: row.get("id"),
        project_id: row.get("project_id"),
        workspace_id: row.get("workspace_id"),
        name: row.get("name"),
        kind: row.get("kind"),
        description: row.get("description"),
        evidence: row.get("evidence"),
        x: row.get("x"),
        y: row.get("y"),
        weight: row.get("weight"),
        created_at: row.get("created_at"),
        source_event: row.get("source_event"),
        event_id: row.get("event_id"),
        icon: row.get("icon"),
        is_ephemeral: row.get::<i64, _>("is_ephemeral") != 0,
        source_asset_id: row.get("source_asset_id"),
        source_chat_id: row.get("source_chat_id"),
        origin_kind: row.get("origin_kind"),
        pinned: row.get::<i64, _>("pinned") != 0,
        deleted_at: row.get("deleted_at"),
        use_count: row.get("use_count"),
        last_used_at: row.get("last_used_at"),
        memory_score: row.get("memory_score"),
    })
}

pub(crate) fn row_to_edge(row: &sqlx::sqlite::SqliteRow) -> Result<GraphEdge, String> {
    use sqlx::Row;
    Ok(GraphEdge {
        id: row.get("id"),
        project_id: row.get("project_id"),
        source: row.get("source"),
        target: row.get("target"),
        relation: row.get("relation"),
        strength: row.get("strength"),
        created_at: row.get("created_at"),
    })
}
