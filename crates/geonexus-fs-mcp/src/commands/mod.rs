pub mod list_directories;
pub mod list_files;
pub mod search_files;
pub mod create_folder;
pub mod create_file;
pub mod update_file;
pub mod delete_file;
pub mod move_file;
pub mod copy_file;
pub mod read_file;
pub mod detect_framework;
pub mod analyze_project;
pub mod create_project;

use async_trait::async_trait;
use serde_json::Value;
use std::path::PathBuf;

use crate::security::path_guard::{PathGuard, PathGuardError};
use crate::security::level_guard::{LevelGuardError, PermissionLevel};
use crate::security::rate_guard::RateGuardError;

#[derive(Debug, thiserror::Error)]
pub enum FsMcpError {
    #[error("command not found: {0}")]
    CommandNotFound(String),
    #[error("invalid arguments: {0}")]
    InvalidArguments(String),
    #[error("path guard error: {0}")]
    PathGuard(#[from] PathGuardError),
    #[error("level guard error: {0}")]
    LevelGuard(#[from] LevelGuardError),
    #[error("rate guard error: {0}")]
    RateGuard(#[from] RateGuardError),
    #[error("io error: {0}")]
    Io(String),
    #[error("confirmation required: {0}")]
    ConfirmationRequired(String),
    #[error("operation denied by user")]
    DeniedByUser,
    #[error("internal error: {0}")]
    Internal(String),
}

impl From<std::io::Error> for FsMcpError {
    fn from(e: std::io::Error) -> Self {
        FsMcpError::Io(e.to_string())
    }
}

#[derive(Debug, Clone)]
pub struct ToolResult {
    pub success: bool,
    pub data: Value,
    pub mutated_fs: bool,
    pub affected_paths: Vec<PathBuf>,
    pub execution_time_ms: u64,
}

impl ToolResult {
    pub fn ok(data: Value) -> Self {
        Self {
            success: true,
            data,
            mutated_fs: false,
            affected_paths: Vec::new(),
            execution_time_ms: 0,
        }
    }

    pub fn with_mutation(mut self, paths: Vec<PathBuf>) -> Self {
        self.mutated_fs = true;
        self.affected_paths = paths;
        self
    }

    pub fn with_time(mut self, ms: u64) -> Self {
        self.execution_time_ms = ms;
        self
    }
}

#[async_trait]
pub trait Command: Send + Sync {
    fn name(&self) -> &'static str;
    fn level_required(&self) -> PermissionLevel;
    fn requires_confirm(&self) -> bool;
    async fn execute(&self, guard: &PathGuard) -> Result<ToolResult, FsMcpError>;
}

pub struct CommandFactory;

impl CommandFactory {
    pub fn build(tool_name: &str, args: Value) -> Result<Box<dyn Command>, FsMcpError> {
        match tool_name {
            "listDirectories" => Ok(Box::new(list_directories::ListDirectories::from_args(args)?)),
            "listFiles" => Ok(Box::new(list_files::ListFiles::from_args(args)?)),
            "searchFiles" => Ok(Box::new(search_files::SearchFiles::from_args(args)?)),
            "createFolder" => Ok(Box::new(create_folder::CreateFolder::from_args(args)?)),
            "createFile" => Ok(Box::new(create_file::CreateFile::from_args(args)?)),
            "updateFile" => Ok(Box::new(update_file::UpdateFile::from_args(args)?)),
            "deleteFile" => Ok(Box::new(delete_file::DeleteFile::from_args(args)?)),
            "moveFile" => Ok(Box::new(move_file::MoveFile::from_args(args)?)),
            "copyFile" => Ok(Box::new(copy_file::CopyFile::from_args(args)?)),
            "readFile" => Ok(Box::new(read_file::ReadFile::from_args(&args)?)),
            "detectFramework" => Ok(Box::new(detect_framework::DetectFramework::from_args(&args)?)),
            "analyzeProject" => Ok(Box::new(analyze_project::AnalyzeProject::from_args(&args)?)),
            "createProject" => Ok(Box::new(create_project::CreateProject::from_args(&args)?)),
            _ => Err(FsMcpError::CommandNotFound(tool_name.to_string())),
        }
    }
}

/// Decorator that wraps a Command with auditing and event emission.
pub struct AuditedOperation {
    inner: Box<dyn Command>,
    event_bus: Option<geonexus_core::events::EventBus>,
}

impl AuditedOperation {
    pub fn new(inner: Box<dyn Command>, event_bus: Option<geonexus_core::events::EventBus>) -> Self {
        Self { inner, event_bus }
    }

    pub async fn execute(&self, guard: &PathGuard) -> Result<ToolResult, FsMcpError> {
        let start = std::time::Instant::now();
        let name = self.inner.name();

        // Emit started event
        if let Some(bus) = &self.event_bus {
            bus.publish(geonexus_core::events::BusEvent::new(
                geonexus_core::events::Domain::System,
                &format!("fs_{}_started", name),
                serde_json::json!({ "tool": name }),
                "fs_mcp",
            ));
        }

        let result = self.inner.execute(guard).await;

        let elapsed = start.elapsed().as_millis() as u64;

        match result {
            Ok(mut res) => {
                res.execution_time_ms = elapsed;

                // Emit completed event
                if let Some(bus) = &self.event_bus {
                    bus.publish(geonexus_core::events::BusEvent::new(
                        geonexus_core::events::Domain::System,
                        &format!("fs_{}_completed", name),
                        serde_json::json!({
                            "tool": name,
                            "success": true,
                            "duration_ms": elapsed,
                            "mutated_fs": res.mutated_fs,
                        }),
                        "fs_mcp",
                    ));
                }

                Ok(res)
            }
            Err(e) => {
                // Emit failed event
                if let Some(bus) = &self.event_bus {
                    bus.publish(geonexus_core::events::BusEvent::new(
                        geonexus_core::events::Domain::System,
                        &format!("fs_{}_failed", name),
                        serde_json::json!({
                            "tool": name,
                            "success": false,
                            "error": e.to_string(),
                            "duration_ms": elapsed,
                        }),
                        "fs_mcp",
                    ));
                }

                Err(e)
            }
        }
    }
}

/// Check if a filename matches secret file patterns (.env, *secret*, *credentials*, id_rsa*).
pub fn is_secret_filename(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.starts_with(".env")
        || lower.contains("secret")
        || lower.contains("credentials")
        || lower.starts_with("id_rsa")
}

/// Extract a string argument from the args Value.
pub fn arg_string(args: &Value, key: &str) -> Result<String, FsMcpError> {
    args.get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| FsMcpError::InvalidArguments(format!("missing or invalid '{}'", key)))
}

/// Extract an optional string argument from the args Value.
pub fn arg_optional_string(args: &Value, key: &str) -> Option<String> {
    args.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
}

/// Extract an optional u64 argument from the args Value.
pub fn arg_optional_u64(args: &Value, key: &str) -> Option<u64> {
    args.get(key).and_then(|v| v.as_u64())
}

/// Extract an optional array of strings argument.
pub fn arg_optional_string_array(args: &Value, key: &str) -> Option<Vec<String>> {
    args.get(key).and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter().filter_map(|item| item.as_str().map(|s| s.to_string())).collect()
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_command_factory_known() {
        let args = json!({ "path": "/test" });
        assert!(CommandFactory::build("listDirectories", args.clone()).is_ok());
        assert!(CommandFactory::build("listFiles", args.clone()).is_ok());
        assert!(CommandFactory::build("searchFiles", json!({ "query": "test" })).is_ok());
    }

    #[test]
    fn test_command_factory_unknown() {
        let result = CommandFactory::build("unknownTool", json!({}));
        assert!(matches!(result, Err(FsMcpError::CommandNotFound(_))));
    }

    #[test]
    fn test_tool_result_ok() {
        let r = ToolResult::ok(json!({"key": "value"}));
        assert!(r.success);
        assert!(!r.mutated_fs);
        assert_eq!(r.data["key"], "value");
    }

    #[test]
    fn test_tool_result_with_mutation() {
        let r = ToolResult::ok(json!(null))
            .with_mutation(vec![PathBuf::from("/test")]);
        assert!(r.mutated_fs);
        assert_eq!(r.affected_paths.len(), 1);
    }

    #[test]
    fn test_arg_string_valid() {
        let args = json!({ "path": "/workspace" });
        assert_eq!(arg_string(&args, "path").unwrap(), "/workspace");
    }

    #[test]
    fn test_arg_string_missing() {
        let args = json!({});
        assert!(arg_string(&args, "path").is_err());
    }

    #[test]
    fn test_arg_optional_string() {
        let args = json!({ "key": "val" });
        assert_eq!(arg_optional_string(&args, "key"), Some("val".into()));
        assert_eq!(arg_optional_string(&args, "missing"), None);
    }

    #[test]
    fn test_arg_optional_u64() {
        let args = json!({ "limit": 20 });
        assert_eq!(arg_optional_u64(&args, "limit"), Some(20));
        assert_eq!(arg_optional_u64(&args, "missing"), None);
    }

    #[test]
    fn test_arg_optional_string_array() {
        let args = json!({ "types": [".rs", ".py"] });
        let types = arg_optional_string_array(&args, "types").unwrap();
        assert_eq!(types, vec![".rs", ".py"]);
    }

    #[test]
    fn test_is_secret_filename_env() {
        assert!(is_secret_filename(".env"));
        assert!(is_secret_filename(".env.production"));
        assert!(is_secret_filename(".env.local"));
    }

    #[test]
    fn test_is_secret_filename_secret() {
        assert!(is_secret_filename("my.secret.file"));
        assert!(is_secret_filename("secrets.json"));
        assert!(is_secret_filename("top_secret_data.txt"));
    }

    #[test]
    fn test_is_secret_filename_credentials() {
        assert!(is_secret_filename("credentials.json"));
        assert!(is_secret_filename("my.credentials.txt"));
    }

    #[test]
    fn test_is_secret_filename_id_rsa() {
        assert!(is_secret_filename("id_rsa"));
        assert!(is_secret_filename("id_rsa.pub"));
    }

    #[test]
    fn test_is_secret_filename_non_secret() {
        assert!(!is_secret_filename("main.rs"));
        assert!(!is_secret_filename("README.md"));
        assert!(!is_secret_filename("package.json"));
        assert!(!is_secret_filename("index.html"));
        assert!(!is_secret_filename("Cargo.toml"));
        assert!(!is_secret_filename("config.json"));
    }
}
