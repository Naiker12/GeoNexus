use async_trait::async_trait;
use serde_json::{json, Value};
use std::path::Path;

use super::{Command, ToolResult, FsMcpError, arg_string};
use crate::security::path_guard::PathGuard;
use crate::security::level_guard::PermissionLevel;

pub struct CreateFolder {
    path: String,
}

impl CreateFolder {
    pub fn from_args(args: Value) -> Result<Self, FsMcpError> {
        let path = arg_string(&args, "path")?;
        Ok(Self { path })
    }
}

#[async_trait]
impl Command for CreateFolder {
    fn name(&self) -> &'static str {
        "createFolder"
    }

    fn level_required(&self) -> PermissionLevel {
        PermissionLevel::Write
    }

    fn requires_confirm(&self) -> bool {
        false
    }

    async fn execute(&self, guard: &PathGuard) -> Result<ToolResult, FsMcpError> {
        let path = Path::new(&self.path);

        // Validate path (file doesn't exist yet, so use validate_path_only)
        let canonical = guard.validate_path_only(path)?;

        if canonical.exists() {
            if canonical.is_dir() {
                return Ok(ToolResult::ok(json!({
                    "created": false,
                    "path": canonical.to_string_lossy(),
                    "message": "folder already exists".to_string(),
                })));
            } else {
                return Err(FsMcpError::InvalidArguments(format!(
                    "'{}' already exists and is not a directory", self.path
                )));
            }
        }

        tokio::fs::create_dir_all(&canonical).await
            .map_err(|e| FsMcpError::Io(e.to_string()))?;

        Ok(ToolResult::ok(json!({
            "created": true,
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
    async fn test_create_folder_basic() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = CreateFolder {
            path: root.join("new_folder").to_string_lossy().to_string(),
        };
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        assert!(result.data["created"].as_bool().unwrap());
        assert!(root.join("new_folder").exists());
    }

    #[tokio::test]
    async fn test_create_folder_already_exists() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        fs::create_dir_all(root.join("existing")).unwrap();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = CreateFolder {
            path: root.join("existing").to_string_lossy().to_string(),
        };
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        assert!(!result.data["created"].as_bool().unwrap());
    }

    #[tokio::test]
    async fn test_create_folder_outside_allowlist() {
        let guard = PathGuard::new(
            vec![PathBuf::from("D:/Workspace")],
            vec![],
        );
        let cmd = CreateFolder {
            path: "D:/Other/new_folder".into(),
        };
        let result = cmd.execute(&guard).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_from_args() {
        let cmd = CreateFolder::from_args(json!({ "path": "/test" })).unwrap();
        assert_eq!(cmd.path, "/test");
    }
}
