use std::sync::Arc;

use crate::commands::{CommandFactory, AuditedOperation, ToolResult, FsMcpError};
use crate::config::FilesystemConfig;
use crate::security::{GuardChain, PathGuard};
use crate::security::level_guard::LevelGuard;
use crate::security::rate_guard::RateGuard;
use crate::security::confirm_gate::ConfirmGate;
use crate::timeline::{FilesystemTimeline, TimelineEntry, OperationStatus};

/// Entry point único para el sistema Filesystem MCP.
/// Orquesta: CommandFactory → GuardChain → AuditedOperation
pub struct FilesystemMcpFacade {
    pub guard_chain: GuardChain,
    pub event_bus: Option<geonexus_core::events::EventBus>,
    pub config: FilesystemConfig,
    pub timeline: FilesystemTimeline,
}

impl FilesystemMcpFacade {
    pub fn new(config: FilesystemConfig, event_bus: Option<geonexus_core::events::EventBus>) -> Self {
        let guard_chain = GuardChain::new(&config);
        Self { guard_chain, event_bus, config, timeline: FilesystemTimeline::default() }
    }

    pub fn timeline(&self) -> &FilesystemTimeline {
        &self.timeline
    }

    pub fn path_guard(&self) -> &PathGuard {
        &self.guard_chain.path_guard
    }

    pub fn level_guard(&self) -> &LevelGuard {
        &self.guard_chain.level_guard
    }

    pub fn rate_guard(&self) -> &RateGuard {
        &self.guard_chain.rate_guard
    }

    pub fn confirm_gate(&self) -> &Arc<ConfirmGate> {
        &self.guard_chain.confirm_gate
    }

    /// Dispatch a tool invocation through the full pipeline:
    /// 1. Build Command from tool_name + args
    /// 2. Check LevelGuard (permission level)
    /// 3. Check RateGuard (rate limit)
    /// 4. Check ConfirmGate if needed
    /// 5. Execute via AuditedOperation
    /// 6. Update index if filesystem was mutated
    pub async fn dispatch(
        &self,
        tool_name: &str,
        args: serde_json::Value,
        session_id: &str,
    ) -> Result<ToolResult, FsMcpError> {
        let start = std::time::Instant::now();
        let path = args.get("path").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
        let entry_id = uuid::Uuid::new_v4().to_string();

        // Record start in timeline
        self.timeline.add_entry(TimelineEntry {
            id: entry_id.clone(),
            tool_name: tool_name.to_string(),
            path: path.clone(),
            status: OperationStatus::Started,
            started_at: chrono::Utc::now().timestamp(),
            duration_ms: None,
        });

        // 1. Build the command
        let command = CommandFactory::build(tool_name, args.clone())?;

        // 2. Level check (permission level)
        if let Some(path_str) = args.get("path").and_then(|v| v.as_str()) {
            let p = std::path::Path::new(path_str);
            self.level_guard().check(p, tool_name)?;
        }

        // 3. Rate check (only for write operations)
        if command.level_required() > crate::security::level_guard::PermissionLevel::Read {
            self.rate_guard().check_write(session_id)?;
        }

        // 4. Confirmation check
        if command.requires_confirm() {
            let preview = crate::security::confirm_gate::ConfirmPreview {
                action: tool_name.to_string(),
                target_path: path.clone(),
                details: args.get("content")
                    .map(|v| format!("content ({} bytes)", v.as_str().map(|s| s.len()).unwrap_or(0))),
            };
            let request_id = uuid::Uuid::new_v4().to_string();
            let approved = self.confirm_gate().require(
                &request_id,
                preview,
                self.event_bus.as_ref(),
            ).await;
            if !approved {
                return Err(FsMcpError::DeniedByUser);
            }
        }

        // 5. Execute with auditing
        let audited = AuditedOperation::new(command, self.event_bus.clone());
        let result = audited.execute(self.path_guard()).await;

        let elapsed = start.elapsed().as_millis() as u64;

        // Record completion/failure in timeline
        match &result {
            Ok(_) => {
                self.timeline.add_entry(TimelineEntry {
                    id: entry_id,
                    tool_name: tool_name.to_string(),
                    path: path,
                    status: OperationStatus::Completed,
                    started_at: chrono::Utc::now().timestamp(),
                    duration_ms: Some(elapsed),
                });
            }
            Err(_) => {
                self.timeline.add_entry(TimelineEntry {
                    id: entry_id,
                    tool_name: tool_name.to_string(),
                    path: path,
                    status: OperationStatus::Failed,
                    started_at: chrono::Utc::now().timestamp(),
                    duration_ms: Some(elapsed),
                });
            }
        }

        // 6. Update index if filesystem was mutated
        if let Ok(ref res) = result {
            if res.mutated_fs {
                tracing::info!(
                    "Filesystem mutated by '{}': {} paths affected",
                    tool_name,
                    res.affected_paths.len()
                );
            }
        }

        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    async fn test_facade_unknown_command() {
        let config = FilesystemConfig::default();
        let facade = FilesystemMcpFacade::new(config, None);
        let result = facade.dispatch("unknownTool", json!({}), "session-1").await;
        assert!(matches!(result, Err(FsMcpError::CommandNotFound(_))));
    }

    #[tokio::test]
    async fn test_facade_list_directories_outside_allowlist() {
        let mut config = FilesystemConfig::default();
        config.allowed_paths.push(crate::config::AllowedPathEntry {
            path: "D:/Workspace".into(),
            level: "read".into(),
            added_at: "".into(),
            label: "Workspace".into(),
        });
        let facade = FilesystemMcpFacade::new(config, None);
        let result = facade.dispatch(
            "listDirectories",
            json!({ "path": "D:/Other" }),
            "session-1",
        ).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_facade_new() {
        let config = FilesystemConfig::default();
        let facade = FilesystemMcpFacade::new(config, None);
        assert!(facade.event_bus.is_none());
    }
}
