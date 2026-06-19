use async_trait::async_trait;
use crate::types::task::AgentTask;
use crate::workers::handler::WorkerHandler;

pub struct ClassifierWorker;

#[async_trait]
impl WorkerHandler for ClassifierWorker {
    fn agent_type(&self) -> &'static str {
        "classifier"
    }

    fn display_name(&self) -> &'static str {
        "Clasificador"
    }

    async fn execute(&self, task: &AgentTask, _db: sqlx::SqlitePool) -> Result<String, String> {
        let _payload: serde_json::Value = serde_json::from_str(&task.payload)
            .map_err(|e| format!("Error al parsear payload: {e}"))?;

        tracing::info!("[ClassifierWorker] Clasificando tarea {}", task.id);

        // TODO: Implementar clasificación real de assets
        Ok(format!("Tarea {} clasificada (stub)", task.id))
    }
}
