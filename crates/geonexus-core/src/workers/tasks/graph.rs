use async_trait::async_trait;
use serde_json::Value;
use sqlx::SqlitePool;
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

    async fn execute(&self, task: &AgentTask, db: SqlitePool) -> Result<String, String> {
        let payload: Value = serde_json::from_str(&task.payload)
            .map_err(|e| format!("Error al parsear payload: {e}"))?;

        tracing::info!("[GraphWorker] Procesando tarea {}", task.id);

        let entity = payload.get("entity").and_then(|v| v.as_str()).unwrap_or("unknown");
        let relation = payload.get("relation").and_then(|v| v.as_str());
        let target = payload.get("target").and_then(|v| v.as_str());

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS worker_graph (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                entity TEXT NOT NULL,
                relation TEXT,
                target TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )"
        )
        .execute(&db)
        .await
        .map_err(|e| format!("Error creando tabla worker_graph: {e}"))?;

        sqlx::query(
            "INSERT INTO worker_graph (task_id, entity, relation, target) VALUES (?1, ?2, ?3, ?4)"
        )
        .bind(&task.id)
        .bind(entity)
        .bind(relation)
        .bind(target)
        .execute(&db)
        .await
        .map_err(|e| format!("Error insertando en worker_graph: {e}"))?;

        Ok(format!("Entidad '{}' registrada en grafo", entity))
    }
}
