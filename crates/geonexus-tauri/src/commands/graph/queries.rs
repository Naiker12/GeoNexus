use tauri::State;
use geonexus_core::{GraphNode, GraphEdge};
use crate::AppState;

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
