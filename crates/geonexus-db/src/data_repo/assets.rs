use std::path::Path;
use geonexus_core::{DataAsset, AssetValidation, AssetStatus, CacheState};
use geonexus_core::allowlist::ruta_segura;
use crate::DataRepository;
use crate::data_repo::{row_to_asset, to_str};

impl DataRepository {
    /// Retorna los activos del proyecto especificado.
    pub async fn list_data_assets(&self, project_id: &str) -> Result<Vec<DataAsset>, String> {
        if project_id.trim().is_empty() {
            return Err("project_id requerido".into());
        }

        let rows = sqlx::query("SELECT * FROM assets WHERE project_id = ?")
            .bind(project_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Error listando assets: {e}"))?;

        let mut assets = Vec::new();
        for r in rows {
            assets.push(row_to_asset(&r)?);
        }

        Ok(assets)
    }

    /// Obtiene un activo por ID.
    pub async fn get_data_asset(&self, asset_id: &str) -> Result<Option<DataAsset>, String> {
        if asset_id.trim().is_empty() {
            return Err("asset_id requerido".into());
        }

        let opt_row = sqlx::query("SELECT * FROM assets WHERE id = ?")
            .bind(asset_id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| format!("Error obteniendo asset: {e}"))?;

        match opt_row {
            Some(r) => Ok(Some(row_to_asset(&r)?)),
            None => Ok(None),
        }
    }

    async fn local_connector_root(&self, connector_id: Option<&str>) -> Result<Option<String>, String> {
        let Some(connector_id) = connector_id else {
            return Ok(None);
        };

        let row = sqlx::query(
            "SELECT root_path FROM connector_configs WHERE id = ? AND provider = 'local' AND is_active = 1"
        )
        .bind(connector_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| format!("Error validando allowlist del conector: {e}"))?;

        use sqlx::Row;
        Ok(row.and_then(|r| r.get("root_path")))
    }

    pub async fn validate_data_asset(&self, asset_id: &str) -> Result<AssetValidation, String> {
        if asset_id.trim().is_empty() {
            return Err("asset_id requerido".into());
        }

        let asset = self
            .get_data_asset(asset_id)
            .await?
            .ok_or_else(|| format!("Asset no encontrado: {asset_id}"))?;

        let mut issues: Vec<String> = Vec::new();

        // Validar existencia de archivo local
        let file_exists = if asset.source == "local" {
            let exists = Path::new(&asset.location).exists();
            if !exists {
                issues.push("Archivo no encontrado en ruta local".into());
            }
            exists
        } else {
            true // cloud se verificará en fase posterior
        };

        let path_allowed = if asset.source == "local" {
            match self.local_connector_root(asset.connector_id.as_deref()).await? {
                Some(root_path) => ruta_segura(&root_path, &asset.location).is_ok(),
                None => false,
            }
        } else {
            true
        };
        if !path_allowed {
            issues.push("Ruta fuera de allowlist del conector".into());
        }

        let metadata_ok = asset.size_bytes.is_some();
        if !metadata_ok {
            issues.push("Metadata incompleta: falta size_bytes".into());
        }

        let cache_valid = asset.cache_state == CacheState::Cached;
        if !cache_valid {
            issues.push(format!(
                "Cache en estado '{:?}' — no apto para IA",
                asset.cache_state
            ));
        }

        let chunks_exist = asset.chunks > 0;
        if !chunks_exist {
            issues.push("Sin chunks — pendiente de indexación (Fase 3)".into());
        }

        Ok(AssetValidation::new(
            asset_id.to_string(),
            file_exists,
            path_allowed,
            metadata_ok,
            cache_valid,
            chunks_exist,
            issues,
        ))
    }

    /// Elimina un activo de datos y todos sus datos relacionados (chunks, eventos, nodos).
    pub async fn delete_data_asset(&self, asset_id: &str) -> Result<(), String> {
        let _ = sqlx::query("DELETE FROM document_chunks WHERE asset_id = ?")
            .bind(asset_id)
            .execute(&self.pool).await;
        let _ = sqlx::query("DELETE FROM sync_events WHERE asset_id = ?")
            .bind(asset_id)
            .execute(&self.pool).await;
        sqlx::query("DELETE FROM assets WHERE id = ?")
            .bind(asset_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error eliminando asset: {e}"))?;
        Ok(())
    }

    /// Inserta o actualiza un activo de datos directamente (útil para registrar nuevos assets).
    pub async fn upsert_data_asset(&self, asset: &DataAsset) -> Result<(), String> {
        sqlx::query(
            "INSERT INTO assets (id, project_id, workspace_id, name, kind, source, location, agent_id, connector_id, status, size_bytes, chunks, embeddings, graph_nodes, cache_state, trace_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                status      = excluded.status,
                size_bytes  = excluded.size_bytes,
                chunks      = excluded.chunks,
                embeddings  = excluded.embeddings,
                graph_nodes = excluded.graph_nodes,
                cache_state = excluded.cache_state,
                trace_id    = excluded.trace_id,
                updated_at  = excluded.updated_at"
        )
        .bind(&asset.id)
        .bind(&asset.project_id)
        .bind(&asset.workspace_id)
        .bind(&asset.name)
        .bind(to_str(&asset.kind))
        .bind(&asset.source)
        .bind(&asset.location)
        .bind(&asset.agent_id)
        .bind(&asset.connector_id)
        .bind(to_str(&asset.status))
        .bind(asset.size_bytes)
        .bind(asset.chunks)
        .bind(asset.embeddings)
        .bind(asset.graph_nodes)
        .bind(to_str(&asset.cache_state))
        .bind(&asset.trace_id)
        .bind(asset.created_at)
        .bind(asset.updated_at)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Error en upsert_data_asset: {e}"))?;
        Ok(())
    }

    /// Actualiza el estado y los contadores de indexación de un activo.
    pub async fn update_asset_indexing_result(
        &self,
        asset_id: &str,
        status: AssetStatus,
        chunks: i64,
        embeddings: i64,
        graph_nodes: i64,
        updated_at: i64,
    ) -> Result<(), String> {
        sqlx::query(
            "UPDATE assets 
             SET status = ?, chunks = ?, embeddings = ?, graph_nodes = ?, updated_at = ?
             WHERE id = ?"
        )
        .bind(to_str(&status))
        .bind(chunks)
        .bind(embeddings)
        .bind(graph_nodes)
        .bind(updated_at)
        .bind(asset_id)
        .execute(&self.pool)
        .await
        .map_err(|e| format!("Error actualizando resultado de indexación del asset: {e}"))?;
        Ok(())
    }
}
