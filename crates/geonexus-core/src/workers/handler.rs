use async_trait::async_trait;
use crate::types::task::AgentTask;

#[async_trait]
pub trait WorkerHandler: Send + Sync {
    fn agent_type(&self) -> &'static str;

    fn display_name(&self) -> &'static str {
        self.agent_type()
    }

    async fn execute(&self, task: &AgentTask, db: sqlx::SqlitePool) -> Result<String, String>;
}
