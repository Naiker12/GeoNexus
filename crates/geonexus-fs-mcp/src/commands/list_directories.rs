use async_trait::async_trait;
use serde_json::{json, Value};
use std::path::Path;

use super::{Command, ToolResult, FsMcpError, arg_string};
use crate::security::path_guard::PathGuard;
use crate::security::level_guard::PermissionLevel;

pub struct ListDirectories {
    path: String,
}

impl ListDirectories {
    pub fn from_args(args: serde_json::Value) -> Result<Self, FsMcpError> {
        let path = arg_string(&args, "path")?;
        Ok(Self { path })
    }
}

#[async_trait]
impl Command for ListDirectories {
    fn name(&self) -> &'static str {
        "listDirectories"
    }

    fn level_required(&self) -> PermissionLevel {
        PermissionLevel::Read
    }

    fn requires_confirm(&self) -> bool {
        false
    }

    async fn execute(&self, guard: &PathGuard) -> Result<ToolResult, FsMcpError> {
        let path = Path::new(&self.path);
        let canonical = guard.validate(path)?;

        if !canonical.is_dir() {
            return Err(FsMcpError::InvalidArguments(format!(
                "'{}' is not a directory", self.path
            )));
        }

        let mut directories = Vec::new();
        let mut read_dir = tokio::fs::read_dir(&canonical).await
            .map_err(|e| FsMcpError::Io(e.to_string()))?;

        while let Some(entry) = read_dir.next_entry().await
            .map_err(|e| FsMcpError::Io(e.to_string()))?
        {
            if entry.file_type().await
                .map_err(|e| FsMcpError::Io(e.to_string()))?
                .is_dir()
            {
                let name = entry.file_name().to_string_lossy().to_string();
                let entry_path = entry.path();
                let item_count = count_items_in_dir(&entry_path).await;
                directories.push(json!({
                    "name": name,
                    "path": entry_path.to_string_lossy(),
                    "itemCount": item_count,
                }));
            }
        }

        directories.sort_by(|a, b| a["name"].as_str().unwrap_or("").cmp(b["name"].as_str().unwrap_or("")));

        Ok(ToolResult::ok(json!({ "directories": directories })))
    }
}

async fn count_items_in_dir(path: &Path) -> u64 {
    let mut count = 0u64;
    if let Ok(mut read_dir) = tokio::fs::read_dir(path).await {
        while let Ok(Some(_)) = read_dir.next_entry().await {
            count += 1;
        }
    }
    count
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn setup() -> (TempDir, PathGuard) {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        fs::create_dir_all(root.join("sub1")).unwrap();
        fs::create_dir_all(root.join("sub2")).unwrap();
        fs::create_dir_all(root.join("sub2").join("nested")).unwrap();
        fs::write(root.join("file.txt"), "hello").unwrap();
        let guard = PathGuard::new(vec![root], vec![]);
        (dir, guard)
    }

    #[tokio::test]
    async fn test_list_directories_basic() {
        let (_dir, guard) = setup();
        let cmd = ListDirectories {
            path: guard.raw_roots()[0].to_string_lossy().to_string(),
        };
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        let dirs = result.data["directories"].as_array().unwrap();
        assert_eq!(dirs.len(), 2); // sub1, sub2
        let names: Vec<&str> = dirs.iter().map(|d| d["name"].as_str().unwrap()).collect();
        assert!(names.contains(&"sub1"));
        assert!(names.contains(&"sub2"));
    }

    #[tokio::test]
    async fn test_list_directories_outside_allowlist() {
        let guard = PathGuard::new(
            vec![PathBuf::from("D:/Workspace")],
            vec![],
        );
        let cmd = ListDirectories {
            path: "D:/Other".into(),
        };
        let result = cmd.execute(&guard).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_from_args_valid() {
        let args = json!({ "path": "/test" });
        let cmd = ListDirectories::from_args(args).unwrap();
        assert_eq!(cmd.path, "/test");
    }

    #[test]
    fn test_from_args_missing_path() {
        let result = ListDirectories::from_args(json!({}));
        assert!(result.is_err());
    }
}
