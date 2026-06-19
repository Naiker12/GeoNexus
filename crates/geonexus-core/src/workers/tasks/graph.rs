use async_trait::async_trait;
use crate::types::task::AgentTask;
use crate::workers::handler::WorkerHandler;

pub struct GraphWorker;

#[async_trait]
impl WorkerHandler for GraphWorker {
    fn agent_type(&self) -> &'static str {
        "graph"
    }

    fn display_name(&self) -> &'static str {
        "Grafo"
    }

    async fn execute(&self, task: &AgentTask, _db: sqlx::SqlitePool) -> Result<String, String> {
        let _payload: serde_json::Value = serde_json::from_str(&task.payload)
            .map_err(|e| format!("Error al parsear payload: {e}"))?;

        tracing::info!("[GraphWorker] Procesando tarea {}", task.id);

        // TODO: Implementar mantenimiento de grafo real
        Ok(format!("Tarea {} procesada (stub)", task.id))
    }
}
