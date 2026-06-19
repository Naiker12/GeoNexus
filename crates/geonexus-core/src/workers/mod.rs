pub mod handler;
pub mod tasks;

use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::task::JoinHandle;
use sqlx::{SqlitePool, Row};
use tracing;

use crate::types::task::AgentTask;
use crate::events::{BusEvent, Domain, EventBus};
use handler::WorkerHandler;

pub struct WorkerConfig {
    pub concurrency: usize,
    pub poll_interval_ms: u64,
}

impl Default for WorkerConfig {
    fn default() -> Self {
        Self { concurrency: 4, poll_interval_ms: 1000 }
    }
}

pub struct WorkerPool {
    db: SqlitePool,
    handlers: Arc<Vec<Box<dyn WorkerHandler>>>,
    handles: Arc<RwLock<Vec<JoinHandle<()>>>>,
    config: WorkerConfig,
    event_bus: Option<EventBus>,
}

impl WorkerPool {
    pub fn new(db: SqlitePool, handlers: Vec<Box<dyn WorkerHandler>>) -> Self {
        Self {
            db,
            handlers: Arc::new(handlers),
            handles: Arc::new(RwLock::new(Vec::new())),
            config: WorkerConfig::default(),
            event_bus: None,
        }
    }

    pub fn with_config(mut self, config: WorkerConfig) -> Self {
        self.config = config;
        self
    }

    pub fn with_event_bus(mut self, bus: EventBus) -> Self {
        self.event_bus = Some(bus);
        self
    }

    pub async fn start(&self) {
        let db = self.db.clone();
        let handlers = self.handlers.clone();
        let config = WorkerConfig { ..self.config };
        let bus = self.event_bus.clone();

        for worker_id in 0..config.concurrency {
            let db = db.clone();
            let handlers = handlers.clone();
            let bus = bus.clone();
            let interval = config.poll_interval_ms;

            let handle = tokio::spawn(async move {
                let mut timer = tokio::time::interval(tokio::time::Duration::from_millis(interval));
                loop {
                    timer.tick().await;

                    match pop_and_execute(&db, &handlers, &bus, worker_id).await {
                        Ok(Some(_)) => {},
                        Ok(None) => {},
                        Err(e) => {
                            tracing::warn!("[Worker {worker_id}] Error: {e}");
                        }
                    }
                }
            });

            let handles = self.handles.clone();
            tokio::spawn(async move {
                handles.write().await.push(handle);
            });
        }
    }

    pub async fn shutdown(&self) {
        let handles = self.handles.read().await;
        for handle in handles.iter() {
            handle.abort();
        }
    }
}

fn row_to_task(r: &sqlx::sqlite::SqliteRow) -> PopResult {
    PopResult {
        id: r.get("id"),
        agent_type: r.get("agent_type"),
        payload: r.get("payload"),
        status: r.get("status"),
        created_at: r.get("created_at"),
        started_at: r.get("started_at"),
        completed_at: r.get("completed_at"),
        error: r.get("error"),
        retry_count: r.get("retry_count"),
        max_retries: r.get("max_retries"),
        project_id: r.get("project_id"),
    }
}

#[allow(dead_code)]
struct PopResult {
    id: String, agent_type: String, payload: String, status: String,
    created_at: String, started_at: Option<String>, completed_at: Option<String>,
    error: Option<String>, retry_count: i64, max_retries: i64, project_id: String,
}

async fn pop_and_execute(
    db: &SqlitePool,
    handlers: &[Box<dyn WorkerHandler>],
    bus: &Option<EventBus>,
    worker_id: usize,
) -> Result<Option<()>, String> {
    let rows = sqlx::query(
        "SELECT id, agent_type, payload, status, created_at, started_at, completed_at, error, retry_count, max_retries, project_id FROM agent_tasks WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
    )
    .fetch_all(db)
    .await
    .map_err(|e| format!("Error al buscar tarea: {e}"))?;

    let task = match rows.first() {
        Some(r) => row_to_task(r),
        None => return Ok(None),
    };

    let handler = handlers.iter().find(|h| h.agent_type() == task.agent_type);
    let handler = match handler {
        Some(h) => h,
        None => {
            tracing::warn!("[Worker {worker_id}] No handler for agent_type '{}', skipping", task.agent_type);
            mark_failed(db, &task.id, &format!("No handler for agent_type '{}'", task.agent_type)).await;
            return Ok(Some(()));
        }
    };

    let now = chrono_now();
    sqlx::query(
        "UPDATE agent_tasks SET status = 'running', started_at = ?1 WHERE id = ?2 AND status = 'pending'"
    )
    .bind(&now)
    .bind(&task.id)
    .execute(db)
    .await
    .map_err(|e| format!("Error al marcar tarea como running: {e}"))?;

    tracing::info!("[Worker {worker_id}] Ejecutando {}: {} ({})", handler.display_name(), task.id, task.agent_type);

    if let Some(b) = bus {
        b.publish(BusEvent::new(
            Domain::Agent,
            "task_started",
            serde_json::json!({ "task_id": task.id, "agent_type": task.agent_type, "payload": task.payload }),
            "worker_pool",
        ));
    }

    let agent_task = AgentTask {
        id: task.id.clone(),
        agent_type: task.agent_type.clone(),
        payload: task.payload.clone(),
        status: "running".into(),
        created_at: task.created_at,
        started_at: Some(now),
        completed_at: None,
        error: None,
        retry_count: task.retry_count,
        max_retries: task.max_retries,
        project_id: task.project_id,
    };

    match handler.execute(&agent_task, db.clone()).await {
        Ok(result) => {
            let completed_at = chrono_now();
            sqlx::query(
                "UPDATE agent_tasks SET status = 'completed', completed_at = ?1, error = NULL WHERE id = ?2"
            )
            .bind(&completed_at)
            .bind(&task.id)
            .execute(db)
            .await
            .map_err(|e| format!("Error al completar tarea: {e}"))?;

            tracing::info!("[Worker {worker_id}] Completada {}: {}", handler.display_name(), task.id);

            if let Some(b) = bus {
                b.publish(BusEvent::new(
                    Domain::Agent,
                    "task_completed",
                    serde_json::json!({ "task_id": task.id, "agent_type": task.agent_type, "result": result }),
                    "worker_pool",
                ));
            }
        }
        Err(e) => {
            let err_msg = e.to_string();
            let retry_count: i64 = task.retry_count;
            let max_retries: i64 = task.max_retries;

            if retry_count < max_retries {
                let _ = sqlx::query(
                    "UPDATE agent_tasks SET status = 'pending', error = ?1, retry_count = retry_count + 1, started_at = NULL WHERE id = ?2"
                )
                .bind(&err_msg)
                .bind(&task.id)
                .execute(db).await;
                tracing::warn!("[Worker {worker_id}] Reintentando {}: {} (intento {}/{})", handler.display_name(), task.id, retry_count + 1, max_retries);
            } else {
                mark_failed(db, &task.id, &err_msg).await;
                tracing::error!("[Worker {worker_id}] Falló {}: {}: {}", handler.display_name(), task.id, err_msg);
            }

            if let Some(b) = bus {
                b.publish(BusEvent::new(
                    Domain::Agent,
                    "task_failed",
                    serde_json::json!({ "task_id": task.id, "agent_type": task.agent_type, "error": err_msg, "retry_count": retry_count }),
                    "worker_pool",
                ));
            }
        }
    }

    Ok(Some(()))
}

fn chrono_now() -> String {
    let dur = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{:010}.{:03}", dur.as_secs(), dur.subsec_millis())
}

async fn mark_failed(db: &SqlitePool, task_id: &str, error: &str) {
    let completed_at = chrono_now();
    let _ = sqlx::query(
        "UPDATE agent_tasks SET status = 'failed', completed_at = ?1, error = ?2 WHERE id = ?3"
    )
    .bind(&completed_at)
    .bind(error)
    .bind(task_id)
    .execute(db)
    .await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_worker_config_default() {
        let config = WorkerConfig::default();
        assert_eq!(config.concurrency, 4);
        assert_eq!(config.poll_interval_ms, 1000);
    }

    #[test]
    fn test_chrono_now_format() {
        let now = chrono_now();
        // Format: "0000000000.000"
        assert_eq!(now.len(), 14);
        assert!(now.contains('.'));
        let parts: Vec<&str> = now.split('.').collect();
        assert_eq!(parts.len(), 2);
        assert_eq!(parts[1].len(), 3); // milliseconds
        // Seconds part should be parseable as u64
        let secs: u64 = parts[0].parse().unwrap();
        assert!(secs > 0);
    }

    #[test]
    fn test_worker_config_builder() {
        let config = WorkerConfig {
            concurrency: 2,
            poll_interval_ms: 500,
        };
        assert_eq!(config.concurrency, 2);
        assert_eq!(config.poll_interval_ms, 500);
    }
}
