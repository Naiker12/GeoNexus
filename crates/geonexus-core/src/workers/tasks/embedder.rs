use async_trait::async_trait;
use sqlx::SqlitePool;
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

    async fn execute(&self, task: &AgentTask, db: SqlitePool) -> Result<String, String> {
        let payload: serde_json::Value = serde_json::from_str(&task.payload)
            .map_err(|e| format!("Error al parsear payload: {e}"))?;

        tracing::info!("[EmbedderWorker] Procesando tarea {}", task.id);

        let file_path = payload.get("file_path").and_then(|v| v.as_str()).unwrap_or("unknown");
        let content_len = payload.get("content")
            .and_then(|v| v.as_str())
            .map(|s| s.len())
            .unwrap_or(0);

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS worker_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                content_length INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            )"
        )
        .execute(&db)
        .await
        .map_err(|e| format!("Error creando tabla worker_embeddings: {e}"))?;

        sqlx::query(
            "INSERT INTO worker_embeddings (task_id, file_path, content_length) VALUES (?1, ?2, ?3)"
        )
        .bind(&task.id)
        .bind(file_path)
        .bind(content_len as i64)
        .execute(&db)
        .await
        .map_err(|e| format!("Error insertando en worker_embeddings: {e}"))?;

        Ok(format!("Archivo '{}' ({}) registrado para embedding", file_path, content_len))
    }
}
