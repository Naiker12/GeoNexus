use async_trait::async_trait;
use serde_json::{json, Value};
use std::path::Path;

use super::{Command, ToolResult, FsMcpError, arg_string};
use crate::security::path_guard::PathGuard;
use crate::security::level_guard::PermissionLevel;

pub struct DeleteFile {
    path: String,
}

impl DeleteFile {
    pub fn from_args(args: Value) -> Result<Self, FsMcpError> {
        let path = arg_string(&args, "path")?;
        Ok(Self { path })
    }
}

#[async_trait]
impl Command for DeleteFile {
    fn name(&self) -> &'static str {
        "deleteFile"
    }

    fn level_required(&self) -> PermissionLevel {
        PermissionLevel::Admin
    }

    fn requires_confirm(&self) -> bool {
        true
    }

    async fn execute(&self, guard: &PathGuard) -> Result<ToolResult, FsMcpError> {
        let path = Path::new(&self.path);
        let canonical = guard.validate_path_only(path)?;

        if !canonical.exists() {
            return Ok(ToolResult::ok(json!({
                "deleted": false,
                "path": canonical.to_string_lossy(),
                "message": "file does not exist".to_string(),
            })));
        }

        if canonical.is_dir() {
            tokio::fs::remove_dir_all(&canonical).await
                .map_err(|e| FsMcpError::Io(e.to_string()))?;
        } else {
            tokio::fs::remove_file(&canonical).await
                .map_err(|e| FsMcpError::Io(e.to_string()))?;
        }

        Ok(ToolResult::ok(json!({
            "deleted": true,
            "path": canonical.to_string_lossy(),
        })).with_mutation(vec![canonical.clone()]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use tempfile::TempDir;
    use std::fs;

    #[tokio::test]
    async fn test_delete_file_basic() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        fs::write(root.join("test.txt"), "content").unwrap();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = DeleteFile {
            path: root.join("test.txt").to_string_lossy().to_string(),
        };
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        assert!(result.data["deleted"].as_bool().unwrap());
        assert!(!root.join("test.txt").exists());
    }

    #[tokio::test]
    async fn test_delete_file_nonexistent() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = DeleteFile {
            path: root.join("nonexistent.txt").to_string_lossy().to_string(),
        };
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        assert!(!result.data["deleted"].as_bool().unwrap());
    }

    #[tokio::test]
    async fn test_delete_directory() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        fs::create_dir_all(root.join("mydir")).unwrap();
        fs::write(root.join("mydir").join("file.txt"), "nested").unwrap();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = DeleteFile {
            path: root.join("mydir").to_string_lossy().to_string(),
        };
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        assert!(result.data["deleted"].as_bool().unwrap());
        assert!(!root.join("mydir").exists());
    }

    #[tokio::test]
    async fn test_delete_file_outside_allowlist() {
        let guard = PathGuard::new(
            vec![PathBuf::from("D:/Workspace")],
            vec![],
        );
        let cmd = DeleteFile {
            path: "D:/Other/file.txt".into(),
        };
        let result = cmd.execute(&guard).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_from_args() {
        let cmd = DeleteFile::from_args(json!({ "path": "/test.txt" })).unwrap();
        assert_eq!(cmd.path, "/test.txt");
    }
}
