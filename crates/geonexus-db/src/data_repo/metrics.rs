use geonexus_core::{DataStoreMetrics, SyncEvent};
use crate::DataRepository;
use crate::data_repo::row_to_event;

impl DataRepository {
    /// Obtiene métricas agregadas para el proyecto.
    /// Consulta las tablas reales (document_chunks, graph_nodes) en vez de solo
    /// los contadores de la tabla assets, para reflejar datos aunque no haya assets.
    pub async fn get_data_store_metrics(&self, project_id: &str) -> Result<DataStoreMetrics, String> {
        if project_id.trim().is_empty() {
            return Err("project_id requerido".into());
        }

        let pool = &self.pool;

        // Assets — conteo directo con filtro por estado
        let total_assets: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM assets WHERE project_id = ?"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        let assets_ready: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM assets WHERE project_id = ? AND status = 'ready'"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        let assets_error: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM assets WHERE project_id = ? AND status = 'error'"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        // Chunks reales en document_chunks (JOIN con assets por project_id)
        let total_chunks: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM document_chunks
             WHERE asset_id IN (SELECT id FROM assets WHERE project_id = ?)"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        // Embeddings — se usa SUM de la columna contador de assets
        // (no hay tabla de embeddings independiente)
        let total_embeddings: i64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(embeddings), 0) FROM assets WHERE project_id = ?"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        // Nodos del grafo — consulta directa a graph_nodes
        let total_graph_nodes: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM graph_nodes WHERE project_id = ?"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        // Cache — suma de size_bytes de assets
        let cache_size_bytes: i64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(size_bytes), 0) FROM assets WHERE project_id = ?"
        )
            .bind(project_id)
            .fetch_one(pool)
            .await
            .unwrap_or(0);

        let assets_pending = total_assets - assets_ready - assets_error;

        Ok(DataStoreMetrics {
            project_id: project_id.to_string(),
            total_assets,
            assets_ready,
            assets_pending,
            assets_error,
            total_chunks,
            total_embeddings,
            total_graph_nodes,
            cache_size_bytes,
        })
    }

    /// Obtiene los eventos de sincronización.
    pub async fn get_sync_events(&self, project_id: &str, limit: i64) -> Result<Vec<SyncEvent>, String> {
        if project_id.trim().is_empty() {
            return Err("project_id requerido".into());
        }

        let limit = limit.clamp(1, 100);
        let rows = sqlx::query("SELECT * FROM sync_events WHERE project_id = ? ORDER BY created_at DESC LIMIT ?")
            .bind(project_id)
            .bind(limit)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Error listando eventos de sync: {e}"))?;

        let mut events = Vec::new();
        for r in rows {
            events.push(row_to_event(&r)?);
        }

        Ok(events)
    }
}
