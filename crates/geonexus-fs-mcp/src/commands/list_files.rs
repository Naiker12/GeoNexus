use async_trait::async_trait;
use serde_json::{json, Value};
use std::path::Path;
use std::time::SystemTime;

use super::{Command, ToolResult, FsMcpError, arg_string, arg_optional_string_array};
use crate::security::path_guard::PathGuard;
use crate::security::level_guard::PermissionLevel;

pub struct ListFiles {
    path: String,
    file_types: Option<Vec<String>>,
}

impl ListFiles {
    pub fn from_args(args: serde_json::Value) -> Result<Self, FsMcpError> {
        let path = arg_string(&args, "path")?;
        let file_types = arg_optional_string_array(&args, "fileTypes");
        Ok(Self { path, file_types })
    }
}

#[async_trait]
impl Command for ListFiles {
    fn name(&self) -> &'static str {
        "listFiles"
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

        let mut files = Vec::new();
        let mut read_dir = tokio::fs::read_dir(&canonical).await
            .map_err(|e| FsMcpError::Io(e.to_string()))?;

        while let Some(entry) = read_dir.next_entry().await
            .map_err(|e| FsMcpError::Io(e.to_string()))?
        {
            let ft = entry.file_type().await
                .map_err(|e| FsMcpError::Io(e.to_string()))?;

            if ft.is_dir() {
                continue;
            }

            let entry_path = entry.path();

            // Filter by file type extension
            if let Some(types) = &self.file_types {
                let ext = entry_path.extension()
                    .and_then(|e| e.to_str())
                    .map(|e| format!(".{}", e.to_lowercase()));
                let matches = types.iter().any(|t| {
                    let t_lower = t.to_lowercase();
                    ext.as_deref() == Some(&t_lower)
                });
                if !matches {
                    continue;
                }
            }

            let name = entry.file_name().to_string_lossy().to_string();
            let metadata = entry.metadata().await
                .map_err(|e| FsMcpError::Io(e.to_string()))?;

            let modified_at = metadata.modified()
                .ok()
                .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64);

            files.push(json!({
                "name": name,
                "path": entry_path.to_string_lossy(),
                "sizeBytes": metadata.len(),
                "modifiedAt": modified_at,
            }));
        }

        files.sort_by(|a, b| a["name"].as_str().unwrap_or("").cmp(b["name"].as_str().unwrap_or("")));

        Ok(ToolResult::ok(json!({ "files": files })))
    }
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
        fs::write(root.join("main.rs"), "fn main() {}").unwrap();
        fs::write(root.join("lib.py"), "print('hello')").unwrap();
        fs::write(root.join("data.json"), "{}").unwrap();
        fs::create_dir_all(root.join("sub")).unwrap();
        fs::write(root.join("sub").join("nested.txt"), "nested").unwrap();
        let guard = PathGuard::new(vec![root], vec![]);
        (dir, guard)
    }

    #[tokio::test]
    async fn test_list_files_basic() {
        let (_dir, guard) = setup();
        let cmd = ListFiles {
            path: guard.raw_roots()[0].to_string_lossy().to_string(),
            file_types: None,
        };
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        let files = result.data["files"].as_array().unwrap();
        // Should have 3 files (main.rs, lib.py, data.json) — not sub/ (it's a dir)
        assert_eq!(files.len(), 3);
    }

    #[tokio::test]
    async fn test_list_files_filtered() {
        let (_dir, guard) = setup();
        let cmd = ListFiles {
            path: guard.raw_roots()[0].to_string_lossy().to_string(),
            file_types: Some(vec![".rs".into(), ".py".into()]),
        };
        let result = cmd.execute(&guard).await.unwrap();
        let files = result.data["files"].as_array().unwrap();
        assert_eq!(files.len(), 2);
        let names: Vec<&str> = files.iter().map(|f| f["name"].as_str().unwrap()).collect();
        assert!(names.contains(&"main.rs"));
        assert!(names.contains(&"lib.py"));
        assert!(!names.contains(&"data.json"));
    }

    #[tokio::test]
    async fn test_list_files_nonexistent_dir() {
        let guard = PathGuard::new(
            vec![PathBuf::from("D:/Workspace")],
            vec![],
        );
        let cmd = ListFiles {
            path: "D:/Workspace/nonexistent".into(),
            file_types: None,
        };
        let result = cmd.execute(&guard).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_from_args() {
        let args = json!({ "path": "/test", "fileTypes": [".rs"] });
        let cmd = ListFiles::from_args(args).unwrap();
        assert_eq!(cmd.path, "/test");
        assert_eq!(cmd.file_types, Some(vec![".rs".into()]));
    }
}
