pub mod read_file;
pub mod create_file;
pub mod list_files;
pub mod list_directories;
pub mod search_files;
pub mod update_file;
pub mod delete_file;
pub mod move_file;
pub mod copy_file;
pub mod create_folder;
pub mod create_project;
pub mod detect_framework;
pub mod analyze_project;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use thiserror::Error;

use crate::security::level_guard::PermissionLevel;
use crate::security::path_guard::PathGuard;

// ─── Command trait ─────────────────────────────────────────────

#[async_trait]
pub trait Command: Send + Sync {
    fn name(&self) -> &'static str;
    fn level_required(&self) -> PermissionLevel;
    fn requires_confirm(&self) -> bool;
    async fn execute(&self, guard: &PathGuard) -> Result<ToolResult, FsMcpError>;
}

// ─── ToolResult ────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub success: bool,
    pub data: serde_json::Value,
    pub error: Option<String>,
    pub duration_ms: u64,
    pub mutated_fs: bool,
    pub affected_paths: Vec<PathBuf>,
}

impl ToolResult {
    pub fn ok(data: serde_json::Value) -> Self {
        Self {
            success: true,
            data,
            error: None,
            duration_ms: 0,
            mutated_fs: false,
            affected_paths: vec![],
        }
    }

    pub fn with_mutation(mut self, paths: Vec<PathBuf>) -> Self {
        self.mutated_fs = true;
        self.affected_paths = paths;
        self
    }
}

// ─── Error ─────────────────────────────────────────────────────

#[derive(Debug, Error)]
pub enum FsMcpError {
    #[error("Command not found: {0}")]
    CommandNotFound(String),
    #[error("Invalid arguments: {0}")]
    InvalidArguments(String),
    #[error("Permission denied: {0}")]
    Permission(String),
    #[error("IO error: {0}")]
    Io(String),
    #[error("Denied by user")]
    DeniedByUser,
}

impl From<String> for FsMcpError {
    fn from(s: String) -> Self {
        FsMcpError::InvalidArguments(s)
    }
}

// ─── Helpers ───────────────────────────────────────────────────

pub fn arg_string(args: &serde_json::Value, key: &str) -> Result<String, FsMcpError> {
    args.get(key)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| FsMcpError::InvalidArguments(format!("missing '{key}' argument")))
}

pub fn arg_optional_string(args: &serde_json::Value, key: &str) -> Option<String> {
    args.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
}

pub fn arg_optional_string_array(args: &serde_json::Value, key: &str) -> Option<Vec<String>> {
    args.get(key).and_then(|v| v.as_array()).map(|arr| {
        arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect()
    })
}

pub fn arg_optional_u64(args: &serde_json::Value, key: &str) -> Option<u64> {
    args.get(key).and_then(|v| v.as_u64())
}

pub fn is_secret_filename(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower == ".env"
        || lower.contains("secret")
        || lower.contains("credential")
        || lower == "id_rsa"
        || lower == "id_ed25519"
        || lower.ends_with(".key")
        || lower.ends_with(".pem")
        || lower.ends_with(".keystore")
}

// ─── CommandFactory / AuditedOperation ─────────────────────────

pub struct AuditedOperation {
    command: Box<dyn Command>,
    #[allow(dead_code)]
    event_bus: Option<geonexus_core::events::EventBus>,
}

impl AuditedOperation {
    pub fn new(command: Box<dyn Command>, event_bus: Option<geonexus_core::events::EventBus>) -> Self {
        Self { command, event_bus }
    }

    pub fn level_required(&self) -> PermissionLevel {
        self.command.level_required()
    }

    pub fn requires_confirm(&self) -> bool {
        self.command.requires_confirm()
    }

    pub async fn execute(self, guard: &PathGuard) -> Result<ToolResult, FsMcpError> {
        let start = std::time::Instant::now();
        let result = self.command.execute(guard).await;
        let duration = start.elapsed().as_millis() as u64;
        result.map(|mut r| { r.duration_ms = duration; r })
    }
}

pub struct CommandFactory;

impl CommandFactory {
    pub fn build(tool_name: &str, args: serde_json::Value) -> Result<Box<dyn Command>, FsMcpError> {
        match tool_name {
            "readFile" => Ok(Box::new(crate::commands::read_file::ReadFile::from_args(args)?)),
            "createFile" => Ok(Box::new(crate::commands::create_file::CreateFile::from_args(args)?)),
            "listFiles" => Ok(Box::new(crate::commands::list_files::ListFiles::from_args(args)?)),
            "listDirectories" => Ok(Box::new(crate::commands::list_directories::ListDirectories::from_args(args)?)),
            "searchFiles" => Ok(Box::new(crate::commands::search_files::SearchFiles::from_args(args)?)),
            "updateFile" => Ok(Box::new(crate::commands::update_file::UpdateFile::from_args(args)?)),
            "deleteFile" => Ok(Box::new(crate::commands::delete_file::DeleteFile::from_args(args)?)),
            "moveFile" => Ok(Box::new(crate::commands::move_file::MoveFile::from_args(args)?)),
            "copyFile" => Ok(Box::new(crate::commands::copy_file::CopyFile::from_args(args)?)),
            "createFolder" => Ok(Box::new(crate::commands::create_folder::CreateFolder::from_args(args)?)),
            "createProject" => Ok(Box::new(crate::commands::create_project::CreateProject::from_args(args)?)),
            "detectFramework" => Ok(Box::new(crate::commands::detect_framework::DetectFramework::from_args(args)?)),
            "analyzeProject" => Ok(Box::new(crate::commands::analyze_project::AnalyzeProject::from_args(args)?)),
            _ => Err(FsMcpError::CommandNotFound(tool_name.to_string())),
        }
    }
}
