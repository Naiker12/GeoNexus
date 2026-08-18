use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTask {
    pub id: String,
    pub agent_type: String,
    pub payload: String,
    pub status: String,
    pub created_at: String,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub error: Option<String>,
    pub retry_count: i64,
    pub max_retries: i64,
    pub project_id: String,
}

impl AgentTask {
    pub fn is_pending(&self) -> bool {
        self.status == "pending"
    }
    pub fn is_running(&self) -> bool {
        self.status == "running"
    }
    pub fn is_done(&self) -> bool {
        self.status == "completed" || self.status == "failed"
    }
}
