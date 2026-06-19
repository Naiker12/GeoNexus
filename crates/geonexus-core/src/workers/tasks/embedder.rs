use async_trait::async_trait;
use crate::types::task::AgentTask;
use crate::workers::handler::WorkerHandler;

pub struct EmbedderWorker;

#[async_trait]
impl WorkerHandler for EmbedderWorker {
    fn agent_type(&self) -> &'static str {
        "embedding"
    }

    fn display_name(&self) -> &'static str {
        "Embedder"
    }

    async fn execute(&self, task: &AgentTask, _db: sqlx::SqlitePool) -> Result<String, String> {
        let _payload: serde_json::Value = serde_json::from_str(&task.payload)
            .map_err(|e| format!("Error al parsear payload: {e}"))?;

        tracing::info!("[EmbedderWorker] Procesando tarea {}", task.id);

        // TODO: Implementar embedding real via sidecar
        // Por ahora, stub que completa exitosamente
        Ok(format!("Tarea {} procesada (stub)", task.id))
    }
}
