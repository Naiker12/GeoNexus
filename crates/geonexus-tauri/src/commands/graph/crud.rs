use tauri::State;
use sqlx::Row;
use geonexus_core::GraphNode;
use crate::AppState;

fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

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
    }
}

#[tauri::command]
pub async fn delete_graph_node(
    id: String,
    force: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = &state.db;

    // Verificar si el nodo está fijado
    let pinned: i64 = sqlx::query_scalar("SELECT pinned FROM graph_nodes WHERE id = ?")
        .bind(&id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error comprobando pin del nodo: {e}"))?
        .unwrap_or(0);

    if pinned != 0 && !force {
        return Err("El nodo está fijado y no se puede borrar sin antes desfijarlo.".into());
    }

    // Borrado suave: establecer deleted_at al timestamp actual como cadena de texto
    let now_str = unix_now().to_string();
    sqlx::query("UPDATE graph_nodes SET deleted_at = ? WHERE id = ?")
        .bind(now_str)
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error al borrar el nodo: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn pin_node(
    id: String,
    pinned: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = &state.db;
    let pinned_val = if pinned { 1i64 } else { 0i64 };

    sqlx::query("UPDATE graph_nodes SET pinned = ? WHERE id = ?")
        .bind(pinned_val)
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error al cambiar estado de pin del nodo: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn restore_graph_node(
    id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let pool = &state.db;

    sqlx::query("UPDATE graph_nodes SET deleted_at = NULL WHERE id = ?")
        .bind(&id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error al restaurar el nodo: {e}"))?;

    Ok(())
}

#[tauri::command]
pub async fn list_orphan_nodes(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<GraphNode>, String> {
    let pool = &state.db;

    let rows = sqlx::query(
        "SELECT * FROM graph_nodes 
         WHERE project_id = ? 
           AND source_asset_id IS NULL 
           AND source_chat_id IS NULL 
           AND deleted_at IS NULL"
     )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error listando nodos huérfanos: {e}"))?;

    let nodes = rows.iter().map(map_row_to_node).collect();
    Ok(nodes)
}

#[tauri::command]
pub async fn merge_nodes(
    ids: Vec<String>,
    name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if ids.is_empty() {
        return Err("Se requieren IDs de nodos para fusionar.".into());
    }

    let pool = &state.db;

    // Obtener detalles de los nodos
    let mut db_nodes = Vec::new();
    for id in &ids {
        let row_opt = sqlx::query("SELECT * FROM graph_nodes WHERE id = ? AND deleted_at IS NULL")
            .bind(id)
            .fetch_optional(pool)
            .await
            .map_err(|e| format!("Error obteniendo nodo {id} para fusión: {e}"))?;
        
        if let Some(row) = row_opt {
            db_nodes.push(map_row_to_node(&row));
        }
    }

    if db_nodes.is_empty() {
        return Err("No se encontraron nodos válidos para fusionar.".into());
    }

    // Seleccionar el nodo base (el primero)
    let base_node = &db_nodes[0];
    let base_id = &base_node.id;

    // Calcular atributos agregados
    let mut total_weight = 0;
    let mut descriptions = Vec::new();
    let mut evidences = Vec::new();
    let mut sum_x = 0.0;
    let mut sum_y = 0.0;

    for node in &db_nodes {
        total_weight += node.weight;
        if !node.description.is_empty() && !descriptions.contains(&node.description) {
            descriptions.push(node.description.clone());
        }
        if !node.evidence.is_empty() && !evidences.contains(&node.evidence) {
            evidences.push(node.evidence.clone());
        }
        sum_x += node.x;
        sum_y += node.y;
    }

    let count = db_nodes.len() as f64;
    let avg_x = sum_x / count;
    let avg_y = sum_y / count;
    let merged_desc = descriptions.join(" | ");
    let merged_evidence = evidences.join(" y ");

    // Iniciar transacción de base de datos
    let mut tx = pool.begin()
        .await
        .map_err(|e| format!("Error iniciando transacción de fusión: {e}"))?;

    // Redirigir aristas de otros nodos al nodo base
    for node in &db_nodes {
        if &node.id == base_id {
            continue;
        }

        // Actualizar origen
        sqlx::query("UPDATE graph_edges SET source = ? WHERE source = ?")
            .bind(base_id)
            .bind(&node.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Error redireccionando aristas (origen): {e}"))?;

        // Actualizar destino
        sqlx::query("UPDATE graph_edges SET target = ? WHERE target = ?")
            .bind(base_id)
            .bind(&node.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Error redireccionando aristas (destino): {e}"))?;
    }

    // Eliminar auto-bucles en las aristas
    sqlx::query("DELETE FROM graph_edges WHERE source = target")
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Error limpiando bucles en relaciones: {e}"))?;

    // Eliminar los otros nodos
    for node in &db_nodes {
        if &node.id == base_id {
            continue;
        }
        sqlx::query("DELETE FROM graph_nodes WHERE id = ?")
            .bind(&node.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Error eliminando nodo duplicado: {e}"))?;
    }

    // Actualizar nodo base
    sqlx::query(
        "UPDATE graph_nodes 
         SET name = ?, weight = ?, description = ?, evidence = ?, x = ?, y = ? 
         WHERE id = ?"
    )
    .bind(name)
    .bind(total_weight)
    .bind(merged_desc)
    .bind(merged_evidence)
    .bind(avg_x)
    .bind(avg_y)
    .bind(base_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Error actualizando nodo base: {e}"))?;

    tx.commit()
        .await
        .map_err(|e| format!("Error confirmando transacción de fusión: {e}"))?;

    Ok(())
}
