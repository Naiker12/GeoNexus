use async_trait::async_trait;
use serde_json::json;
use std::path::Path;

use crate::commands::{Command, ToolResult, FsMcpError, arg_string, is_secret_filename};
use crate::security::level_guard::PermissionLevel;
use crate::security::path_guard::PathGuard;

pub struct ReadFile {
    path: String,
    secret_file: bool,
}

impl ReadFile {
    pub fn from_args(args: &serde_json::Value) -> Result<Self, FsMcpError> {
        let path = arg_string(args, "path")?;
        let is_secret = Path::new(&path)
            .file_name()
            .map(|n| is_secret_filename(&n.to_string_lossy()))
            .unwrap_or(false);
        Ok(Self { path, secret_file: is_secret })
    }
}

#[async_trait]
impl Command for ReadFile {
    fn name(&self) -> &'static str {
        "readFile"
    }

    fn level_required(&self) -> PermissionLevel {
        PermissionLevel::Read
    }

    fn requires_confirm(&self) -> bool {
        self.secret_file
    }

    async fn execute(&self, guard: &PathGuard) -> Result<ToolResult, FsMcpError> {
        let path = Path::new(&self.path);
        let canonical = guard.validate(path)?;

        if !canonical.is_file() {
            return Ok(ToolResult::ok(json!({
                "error": "path is not a file",
                "path": canonical.to_string_lossy(),
            })));
        }

        let content = tokio::fs::read_to_string(&canonical).await
            .map_err(|e| FsMcpError::Io(e.to_string()))?;

        let metadata = canonical.metadata()
            .map_err(|e| FsMcpError::Io(e.to_string()))?;

        Ok(ToolResult::ok(json!({
            "path": canonical.to_string_lossy(),
            "content": content,
            "size_bytes": metadata.len(),
            "modified": metadata.modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64),
        })))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::TempDir;

    #[test]
    fn test_from_args() {
        let cmd = ReadFile::from_args(&json!({"path": "/test/file.txt"})).unwrap();
        assert_eq!(cmd.path, "/test/file.txt");
    }

    #[tokio::test]
    async fn test_read_file_basic() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("test.txt");
        std::fs::write(&file_path, "hello world").unwrap();

        let guard = crate::security::PathGuard::new(
            vec![dir.path().to_path_buf()],
            vec![],
        );
        let cmd = ReadFile::from_args(&json!({"path": file_path.to_string_lossy().to_string()})).unwrap();
        let result = cmd.execute(&guard).await.unwrap();
        assert_eq!(result.data["content"], "hello world");
        assert_eq!(result.data["size_bytes"], 11);
    }

    #[tokio::test]
    async fn test_read_file_nonexistent() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("nonexistent.txt");

        let guard = crate::security::PathGuard::new(
            vec![dir.path().to_path_buf()],
            vec![],
        );
        let cmd = ReadFile::from_args(&json!({"path": file_path.to_string_lossy().to_string()})).unwrap();
        let result = cmd.execute(&guard).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_read_file_outside_allowlist() {
        let dir = TempDir::new().unwrap();
        let outside = dir.path().join("../outside.txt");
        std::fs::write(&outside, "data").ok();

        let guard = crate::security::PathGuard::new(
            vec![dir.path().join("subdir")],
            vec![],
        );
        let cmd = ReadFile::from_args(&json!({"path": outside.to_string_lossy().to_string()})).unwrap();
        let result = cmd.execute(&guard).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_secret_file_detection_env() {
        let cmd = ReadFile::from_args(&json!({"path": "/workspace/.env"})).unwrap();
        assert!(cmd.secret_file);
        assert!(cmd.requires_confirm());
    }

    #[test]
    fn test_secret_file_detection_secret() {
        let cmd = ReadFile::from_args(&json!({"path": "/workspace/my.secret.file"})).unwrap();
        assert!(cmd.secret_file);
    }

    #[test]
    fn test_secret_file_detection_credentials() {
        let cmd = ReadFile::from_args(&json!({"path": "/workspace/credentials.json"})).unwrap();
        assert!(cmd.secret_file);
    }

    #[test]
    fn test_secret_file_detection_id_rsa() {
        let cmd = ReadFile::from_args(&json!({"path": "/workspace/.ssh/id_rsa"})).unwrap();
        assert!(cmd.secret_file);
    }

    #[test]
    fn test_non_secret_file() {
        let cmd = ReadFile::from_args(&json!({"path": "/workspace/main.rs"})).unwrap();
        assert!(!cmd.secret_file);
        assert!(!cmd.requires_confirm());
    }
}
