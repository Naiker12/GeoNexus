use async_trait::async_trait;

use crate::config::FilesystemConfig;
use crate::facade::FilesystemMcpFacade;

pub struct FilesystemWorker;

#[async_trait]
impl geonexus_core::workers::handler::WorkerHandler for FilesystemWorker {
    fn agent_type(&self) -> &'static str {
        "filesystem"
    }

    fn display_name(&self) -> &'static str {
        "Filesystem MCP Worker"
    }

    async fn execute(
        &self,
        task: &geonexus_core::types::task::AgentTask,
        _db: sqlx::SqlitePool,
    ) -> Result<String, String> {
        let payload: serde_json::Value = serde_json::from_str(&task.payload)
            .map_err(|e| format!("invalid task payload JSON: {}", e))?;

        let tool_name = payload.get("tool_name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "missing 'tool_name' in task payload".to_string())?;

        let args = payload.get("args")
            .ok_or_else(|| "missing 'args' in task payload".to_string())?;

        let config = FilesystemConfig::load()
            .map_err(|e| format!("failed to load filesystem config: {}", e))?;

        let facade = FilesystemMcpFacade::new(config, None);
        let session_id = &task.id;

        let result = facade.dispatch(tool_name, args.clone(), session_id)
            .await
            .map_err(|e| format!("fs-mcp error: {}", e))?;

        serde_json::to_string(&result.data)
            .map_err(|e| format!("serialization error: {}", e))
    }
}
