use tauri::{AppHandle, Emitter, State};
use crate::AppState;
use geonexus_core::{GraphNode, GraphUpdatePayload};

/// Emite un evento graph:updated via Tauri con el payload dado.
pub fn emit_graph_update(app: &AppHandle, payload: GraphUpdatePayload) {
    let _ = app.emit("graph:updated", payload);
}

/// Limpia todos los nodos efímeros (is_ephemeral = true) del grafo.
#[tauri::command]
pub async fn clear_ephemeral_nodes(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<u64, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }

    let result = sqlx::query(
        "DELETE FROM graph_nodes WHERE project_id = ? AND is_ephemeral = 1"
    )
    .bind(&project_id)
    .execute(&state.db)
    .await
    .map_err(|e| format!("Error limpiando nodos efímeros: {e}"))?;

    Ok(result.rows_affected())
}

/// Obtiene los nodos del grafo para un proyecto, opcionalmente filtrados por source_event.
#[tauri::command]
pub async fn get_recent_graph_events(
    project_id: String,
    source_event: Option<String>,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<GraphNode>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }

    let limit = limit.unwrap_or(20).clamp(1, 100);
    let all = state.repo.list_graph_nodes(&project_id).await?;

    let mut filtered: Vec<GraphNode> = if let Some(ref src) = source_event {
        all.into_iter()
            .filter(|n| n.source_event == *src)
            .collect()
    } else {
        all.into_iter()
            .filter(|n| !n.source_event.is_empty())
            .collect()
    };

   
    filtered.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    filtered.truncate(limit as usize);

    Ok(filtered)
}
