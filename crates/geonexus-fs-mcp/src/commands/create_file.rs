use async_trait::async_trait;
use serde_json::{json, Value};
use std::path::Path;

use super::{Command, ToolResult, FsMcpError, arg_string};
use crate::security::path_guard::PathGuard;
use crate::security::level_guard::PermissionLevel;

pub struct CreateFile {
    path: String,
    content: String,
}

impl CreateFile {
    pub fn from_args(args: Value) -> Result<Self, FsMcpError> {
        let path = arg_string(&args, "path")?;
        let content = super::arg_optional_string(&args, "content").unwrap_or_default();
        Ok(Self { path, content })
    }
}

#[async_trait]
impl Command for CreateFile {
    fn name(&self) -> &'static str {
        "createFile"
    }

    fn level_required(&self) -> PermissionLevel {
        PermissionLevel::Write
    }

    fn requires_confirm(&self) -> bool {
        false
    }

    async fn execute(&self, guard: &PathGuard) -> Result<ToolResult, FsMcpError> {
        let path = Path::new(&self.path);
        let canonical = guard.validate_path_only(path)?;

        if let Some(parent) = canonical.parent() {
            if !parent.exists() {
                return Err(FsMcpError::InvalidArguments(format!(
                    "parent directory '{}' does not exist", parent.to_string_lossy()
                )));
            }
        }

        let was_overwrite = canonical.exists();

        tokio::fs::write(&canonical, &self.content).await
            .map_err(|e| FsMcpError::Io(e.to_string()))?;

        Ok(ToolResult::ok(json!({
            "created": true,
            "path": canonical.to_string_lossy(),
            "overwritten": was_overwrite,
        })).with_mutation(vec![canonical.clone()]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    #[tokio::test]
    async fn test_create_file_basic() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = CreateFile {
            path: root.join("test.txt").to_string_lossy().to_string(),
            content: "hello world".into(),
        };
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        assert!(!result.data["overwritten"].as_bool().unwrap());
        assert_eq!(
            fs::read_to_string(root.join("test.txt")).unwrap(),
            "hello world"
        );
    }

    #[tokio::test]
    async fn test_create_file_overwrite() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        fs::write(root.join("test.txt"), "original").unwrap();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = CreateFile {
            path: root.join("test.txt").to_string_lossy().to_string(),
            content: "updated".into(),
        };
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        assert!(result.data["overwritten"].as_bool().unwrap());
        assert_eq!(
            fs::read_to_string(root.join("test.txt")).unwrap(),
            "updated"
        );
    }

    #[tokio::test]
    async fn test_create_file_missing_parent() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = CreateFile {
            path: root.join("nonexistent_dir").join("file.txt").to_string_lossy().to_string(),
            content: "test".into(),
        };
        let result = cmd.execute(&guard).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_from_args() {
        let cmd = CreateFile::from_args(json!({
            "path": "/test.txt",
            "content": "data"
        })).unwrap();
        assert_eq!(cmd.path, "/test.txt");
        assert_eq!(cmd.content, "data");
    }

    #[test]
    fn test_from_args_no_content() {
        let cmd = CreateFile::from_args(json!({ "path": "/test.txt" })).unwrap();
        assert!(cmd.content.is_empty());
    }
}
