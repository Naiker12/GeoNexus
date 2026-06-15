use serde::Serialize;
use tauri::State;
use geonexus_core::{GraphNode, GraphEdge};
use sqlx::Row;
use crate::AppState;

fn map_row_to_node(row: &sqlx::sqlite::SqliteRow) -> GraphNode {
    GraphNode {
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
    }
}

#[derive(Debug, Serialize)]
pub struct SearchGraphNodesResult {
    pub total: i32,
    pub nodes: Vec<GraphNode>,
}

/// Obtiene todos los nodos del grafo para un proyecto.
#[tauri::command]
pub async fn list_graph_nodes(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<GraphNode>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    state.repo.list_graph_nodes(&project_id).await
}

/// Busca nodos del grafo por nombre con paginación y filtro opcional por tipo.
#[tauri::command]
pub async fn search_graph_nodes(
    project_id: String,
    query: String,
    kind: Option<String>,
    limit: Option<i32>,
    offset: Option<i32>,
    state: State<'_, AppState>,
) -> Result<SearchGraphNodesResult, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }

    let pool = &state.db;
    let pattern = format!("%{}%", query);
    let lim = limit.unwrap_or(20).max(1).min(100);
    let off = offset.unwrap_or(0).max(0);

    // Total count
    let total: i64 = if let Some(ref k) = kind {
        sqlx::query_scalar(
            "SELECT COUNT(*) FROM graph_nodes
             WHERE project_id = ? AND deleted_at IS NULL AND name LIKE ? AND kind = ?"
        )
        .bind(&project_id)
        .bind(&pattern)
        .bind(k)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Error contando nodos: {e}"))?
    } else {
        sqlx::query_scalar(
            "SELECT COUNT(*) FROM graph_nodes
             WHERE project_id = ? AND deleted_at IS NULL AND name LIKE ?"
        )
        .bind(&project_id)
        .bind(&pattern)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Error contando nodos: {e}"))?
    };

    // Paginated results
    let rows = if let Some(ref k) = kind {
        sqlx::query(
            "SELECT * FROM graph_nodes
             WHERE project_id = ? AND deleted_at IS NULL AND name LIKE ? AND kind = ?
             ORDER BY weight DESC, created_at DESC
             LIMIT ? OFFSET ?"
        )
        .bind(&project_id)
        .bind(&pattern)
        .bind(k)
        .bind(lim)
        .bind(off)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error buscando nodos: {e}"))?
    } else {
        sqlx::query(
            "SELECT * FROM graph_nodes
             WHERE project_id = ? AND deleted_at IS NULL AND name LIKE ?
             ORDER BY weight DESC, created_at DESC
             LIMIT ? OFFSET ?"
        )
        .bind(&project_id)
        .bind(&pattern)
        .bind(lim)
        .bind(off)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error buscando nodos: {e}"))?
    };

    let nodes: Vec<GraphNode> = rows.iter().map(map_row_to_node).collect();

    Ok(SearchGraphNodesResult { total: total as i32, nodes })
}

/// Obtiene todas las aristas/relaciones del grafo para un proyecto.
#[tauri::command]
pub async fn list_graph_edges(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<GraphEdge>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    state.repo.list_graph_edges(&project_id).await
}

/// Actualiza la posición de un nodo en el canvas (persistencia al arrastrar).
#[tauri::command]
pub async fn update_node_position(
    node_id: String,
    x: f64,
    y: f64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if node_id.trim().is_empty() {
        return Err("node_id requerido".into());
    }
    state.repo.update_node_position(&node_id, x, y).await
}
