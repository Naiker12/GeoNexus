use async_trait::async_trait;
use sqlx::Row;
use crate::types::task::AgentTask;
use crate::workers::handler::WorkerHandler;

pub struct IndexerWorker;

#[async_trait]
impl WorkerHandler for IndexerWorker {
    fn agent_type(&self) -> &'static str {
        "document"
    }

    fn display_name(&self) -> &'static str {
        "Indexador"
    }

    async fn execute(&self, task: &AgentTask, db: sqlx::SqlitePool) -> Result<String, String> {
        let payload: serde_json::Value = serde_json::from_str(&task.payload)
            .map_err(|e| format!("Error al parsear payload: {e}"))?;

        let asset_id = payload.get("asset_id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Payload debe contener 'asset_id'".to_string())?;

        tracing::info!("[IndexerWorker] Indexando asset {asset_id}");

        let row = sqlx::query("SELECT COUNT(*) as cnt FROM data_assets WHERE id = ?1")
            .bind(asset_id)
            .fetch_one(&db)
            .await
            .map_err(|e| format!("Error al verificar asset: {e}"))?;

        let count: i64 = row.get("cnt");
        if count == 0 {
            return Err(format!("Asset {asset_id} no encontrado"));
        }

        sqlx::query("UPDATE data_assets SET status = 'indexing' WHERE id = ?1")
            .bind(asset_id)
            .execute(&db)
            .await
            .map_err(|e| format!("Error al actualizar estado: {e}"))?;

        sqlx::query("UPDATE data_assets SET status = 'indexed', updated_at = unixepoch() WHERE id = ?1")
            .bind(asset_id)
            .execute(&db)
            .await
            .map_err(|e| format!("Error al marcar como indexado: {e}"))?;

        Ok(format!("Asset {asset_id} indexado correctamente"))
    }
}
