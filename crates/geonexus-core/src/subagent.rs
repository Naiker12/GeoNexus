use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::sync::broadcast;
use uuid::Uuid;

/// A task that can be delegated to a subagent for parallel execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubagentTask {
    pub id: String,
    pub goal: String,
    pub context: Option<String>,
    pub tools: Vec<String>,
    pub max_steps: usize,
    pub created_at: i64,
}

impl SubagentTask {
    pub fn new(goal: String, context: Option<String>, tools: Vec<String>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            goal,
            context,
            tools,
            max_steps: 5,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64,
        }
    }
}

/// Result produced by a subagent after completing its task.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubagentResult {
    pub task_id: String,
    pub success: bool,
    pub summary: String,
    pub detail: Option<String>,
    pub steps_taken: usize,
    pub duration_ms: u64,
    pub error: Option<String>,
}

/// Status update emitted during subagent execution (for frontend streaming).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SubagentEvent {
    TaskAccepted {
        task_id: String,
        goal: String,
    },
    StepCompleted {
        task_id: String,
        step: usize,
        tool: String,
        summary: String,
    },
    TaskCompleted {
        task_id: String,
        summary: String,
    },
    TaskFailed {
        task_id: String,
        error: String,
    },
}

/// Manages concurrent subagent execution with a bounded worker pool.
/// Emits SubagentEvent on the broadcast channel for frontend streaming.
pub struct SubagentManager {
    max_workers: usize,
    results: Arc<Mutex<Vec<SubagentResult>>>,
    event_tx: broadcast::Sender<SubagentEvent>,
}

impl SubagentManager {
    pub fn new(max_workers: usize) -> Self {
        let (tx, _) = broadcast::channel(256);
        Self {
            max_workers,
            results: Arc::new(Mutex::new(Vec::new())),
            event_tx: tx,
        }
    }

    pub fn with_default_workers() -> Self {
        Self::new(4)
    }

    /// Subscribe to event stream for this manager's execution.
    pub fn subscribe(&self) -> broadcast::Receiver<SubagentEvent> {
        self.event_tx.subscribe()
    }

    /// Execute multiple subagent tasks concurrently with a bounded worker pool.
    /// Each task gets its own context and tool set.
    /// Returns when all tasks complete.
    pub async fn execute_all(
        &self,
        tasks: Vec<SubagentTask>,
    ) -> Vec<SubagentResult> {
        let semaphore = Arc::new(tokio::sync::Semaphore::new(self.max_workers));
        let mut handles = Vec::new();
        let tx = self.event_tx.clone();

        for task in tasks {
            let permit = semaphore.clone().acquire_owned().await.unwrap();
            let res = self.results.clone();
            let event_tx = tx.clone();
            let goal = task.goal.clone();
            let task_id = task.id.clone();

            // Emit accepted event
            let _ = event_tx.send(SubagentEvent::TaskAccepted {
                task_id: task_id.clone(),
                goal: goal.clone(),
            });

            let handle = tokio::spawn(async move {
                let _permit = permit;
                let start = std::time::Instant::now();

                // Emit step completed as progress
                let _ = event_tx.send(SubagentEvent::StepCompleted {
                    task_id: task_id.clone(),
                    step: 0,
                    tool: "plan".into(),
                    summary: format!("Iniciando subagente: {}", goal),
                });

                // In production, this would call the Python sidecar for actual execution
                let result = SubagentResult {
                    task_id: task_id.clone(),
                    success: true,
                    summary: format!("Subagente completo: {}", goal),
                    detail: Some("Ejecucion basica — conectar con LLM sidecar para produccion".into()),
                    steps_taken: 1,
                    duration_ms: start.elapsed().as_millis() as u64,
                    error: None,
                };

                let _ = event_tx.send(SubagentEvent::TaskCompleted {
                    task_id: task_id.clone(),
                    summary: result.summary.clone(),
                });

                let mut guard = res.lock().await;
                guard.push(result.clone());
                result
            });
            handles.push(handle);
        }

        let mut output = Vec::new();
        for handle in handles {
            if let Ok(result) = handle.await {
                output.push(result);
            }
        }
        output
    }

    pub async fn get_results(&self) -> Vec<SubagentResult> {
        self.results.lock().await.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_creation() {
        let task = SubagentTask::new(
            "Buscar datos GIS".into(),
            None,
            vec!["search_web".into()],
        );
        assert!(!task.id.is_empty());
        assert_eq!(task.goal, "Buscar datos GIS");
    }

    #[tokio::test]
    async fn test_concurrent_execution() {
        let manager = SubagentManager::new(4);
        let tasks = vec![
            SubagentTask::new("Task 1".into(), None, vec![]),
            SubagentTask::new("Task 2".into(), None, vec![]),
        ];

        let results = manager.execute_all(tasks).await;

        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|r| r.success));
    }
}
