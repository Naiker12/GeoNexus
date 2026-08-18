use geonexus_core::{GraphNode, GraphEdge};
use crate::DataRepository;
use crate::data_repo::{row_to_node, row_to_edge};

impl DataRepository {
    /// Inserta una lista de nodos en el grafo de conocimiento.
    pub async fn insert_graph_nodes(&self, nodes: &[GraphNode]) -> Result<(), String> {
        for node in nodes {
            sqlx::query(
                "INSERT INTO graph_nodes (
                    id, project_id, workspace_id, name, kind, description, evidence, x, y, weight, created_at,
                    source_event, event_id, icon, is_ephemeral, source_asset_id, source_chat_id, origin_kind, pinned, deleted_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                    name            = excluded.name,
                    kind            = excluded.kind,
                    description     = excluded.description,
                    evidence        = excluded.evidence,
                    weight          = MAX(graph_nodes.weight, excluded.weight),
                    source_event    = excluded.source_event,
                    event_id        = excluded.event_id,
                    icon            = excluded.icon,
                    is_ephemeral    = excluded.is_ephemeral,
                    source_asset_id = excluded.source_asset_id,
                    source_chat_id  = excluded.source_chat_id,
                    origin_kind     = excluded.origin_kind,
                    pinned          = excluded.pinned,
                    deleted_at      = CASE WHEN graph_nodes.deleted_at IS NOT NULL THEN graph_nodes.deleted_at ELSE excluded.deleted_at END"
            )
            .bind(&node.id)
            .bind(&node.project_id)
            .bind(&node.workspace_id)
            .bind(&node.name)
            .bind(&node.kind)
            .bind(&node.description)
            .bind(&node.evidence)
            .bind(node.x)
            .bind(node.y)
            .bind(node.weight)
            .bind(node.created_at)
            .bind(&node.source_event)
            .bind(&node.event_id)
            .bind(&node.icon)
            .bind(node.is_ephemeral)
            .bind(&node.source_asset_id)
            .bind(&node.source_chat_id)
            .bind(&node.origin_kind)
            .bind(node.pinned as i64)
            .bind(&node.deleted_at)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error insertando nodo de grafo: {e}"))?;
        }
        Ok(())
    }

    /// Obtiene todos los nodos del grafo para un proyecto.
    pub async fn list_graph_nodes(&self, project_id: &str) -> Result<Vec<GraphNode>, String> {
        let rows = sqlx::query("SELECT * FROM graph_nodes WHERE project_id = ? AND deleted_at IS NULL")
            .bind(project_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Error listando nodos de grafo: {e}"))?;

        let mut list = Vec::new();
        for r in rows {
            list.push(row_to_node(&r)?);
        }
        Ok(list)
    }

    /// Inserta una lista de aristas en el grafo de conocimiento.
    pub async fn insert_graph_edges(&self, edges: &[GraphEdge]) -> Result<(), String> {
        for edge in edges {
            sqlx::query(
                "INSERT INTO graph_edges (id, project_id, source, target, relation, strength, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                    relation = excluded.relation,
                    strength = excluded.strength"
            )
            .bind(&edge.id)
            .bind(&edge.project_id)
            .bind(&edge.source)
            .bind(&edge.target)
            .bind(&edge.relation)
            .bind(edge.strength)
            .bind(edge.created_at)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error insertando arista de grafo: {e}"))?;
        }
        Ok(())
    }

    /// Elimina aristas cuyo source o target no existe o está soft-deleted.
    pub async fn cleanup_orphan_edges(&self, project_id: &str) -> Result<u64, String> {
        let result = sqlx::query(
            "DELETE FROM graph_edges
             WHERE project_id = ?
             AND (source NOT IN (SELECT id FROM graph_nodes WHERE project_id = ? AND deleted_at IS NULL)
               OR target NOT IN (SELECT id FROM graph_nodes WHERE project_id = ? AND deleted_at IS NULL))"
        )
        .bind(project_id)
        .bind(project_id)
        .bind(project_id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Error limpiando aristas huérfanas: {e}"))?;
        Ok(result.rows_affected())
    }

    /// Obtiene todas las aristas/relaciones del grafo para un proyecto.
    /// Limpia automáticamente aristas huérfanas antes de retornar.
    pub async fn list_graph_edges(&self, project_id: &str) -> Result<Vec<GraphEdge>, String> {
        let _ = self.cleanup_orphan_edges(project_id).await;

        let rows = sqlx::query("SELECT * FROM graph_edges WHERE project_id = ?")
            .bind(project_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Error listando aristas de grafo: {e}"))?;

        let mut list = Vec::new();
        for r in rows {
            list.push(row_to_edge(&r)?);
        }
        Ok(list)
    }

    /// Vacía todo el grafo de un proyecto (nodos y aristas).
    pub async fn clear_graph(&self, project_id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM graph_edges WHERE project_id = ?")
            .bind(project_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error limpiando aristas: {e}"))?;
        sqlx::query("DELETE FROM graph_nodes WHERE project_id = ?")
            .bind(project_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error vaciando grafo de proyecto: {e}"))?;
        Ok(())
    }

    /// Actualiza la posicion de un nodo en el canvas (arrastre del usuario).
    pub async fn update_node_position(&self, node_id: &str, x: f64, y: f64) -> Result<(), String> {
        sqlx::query("UPDATE graph_nodes SET x = ?, y = ? WHERE id = ?")
            .bind(x)
            .bind(y)
            .bind(node_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error actualizando posicion de nodo: {e}"))?;
        Ok(())
    }
}
