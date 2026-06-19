use async_trait::async_trait;
use serde_json::{json, Value};
use std::path::Path;

use super::{Command, ToolResult, FsMcpError, arg_string};
use crate::security::path_guard::PathGuard;
use crate::security::level_guard::PermissionLevel;

pub struct CopyFile {
    source: String,
    destination: String,
}

impl CopyFile {
    pub fn from_args(args: Value) -> Result<Self, FsMcpError> {
        let source = arg_string(&args, "source")?;
        let destination = arg_string(&args, "destination")?;
        Ok(Self { source, destination })
    }
}

#[async_trait]
impl Command for CopyFile {
    fn name(&self) -> &'static str {
        "copyFile"
    }

    fn level_required(&self) -> PermissionLevel {
        PermissionLevel::Write
    }

    fn requires_confirm(&self) -> bool {
        false
    }

    async fn execute(&self, guard: &PathGuard) -> Result<ToolResult, FsMcpError> {
        let src = Path::new(&self.source);
        let dst = Path::new(&self.destination);

        let canonical_src = guard.validate(src)?;
        let canonical_dst = guard.validate_path_only(dst)?;

        if !canonical_src.exists() {
            return Err(FsMcpError::InvalidArguments(format!(
                "source '{}' does not exist", self.source
            )));
        }

        if canonical_src.is_dir() {
            return Err(FsMcpError::InvalidArguments(format!(
                "source '{}' is a directory; use moveFile instead", self.source
            )));
        }

        // Ensure parent of destination exists
        if let Some(parent) = canonical_dst.parent() {
            if !parent.exists() {
                tokio::fs::create_dir_all(parent).await
                    .map_err(|e| FsMcpError::Io(e.to_string()))?;
            }
        }

        tokio::fs::copy(&canonical_src, &canonical_dst).await
            .map_err(|e| FsMcpError::Io(e.to_string()))?;

        Ok(ToolResult::ok(json!({
            "copied": true,
            "source": canonical_src.to_string_lossy(),
            "destination": canonical_dst.to_string_lossy(),
        })).with_mutation(vec![canonical_dst.clone()]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    #[tokio::test]
    async fn test_copy_file_basic() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        fs::write(root.join("source.txt"), "content").unwrap();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = CopyFile {
            source: root.join("source.txt").to_string_lossy().to_string(),
            destination: root.join("dest.txt").to_string_lossy().to_string(),
        };
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        assert!(root.join("source.txt").exists());
        assert!(root.join("dest.txt").exists());
        assert_eq!(fs::read_to_string(root.join("dest.txt")).unwrap(), "content");
    }

    #[tokio::test]
    async fn test_copy_file_nonexistent_source() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = CopyFile {
            source: root.join("nonexistent.txt").to_string_lossy().to_string(),
            destination: root.join("dest.txt").to_string_lossy().to_string(),
        };
        let result = cmd.execute(&guard).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_copy_file_directory_source() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        fs::create_dir_all(root.join("mydir")).unwrap();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = CopyFile {
            source: root.join("mydir").to_string_lossy().to_string(),
            destination: root.join("newdir").to_string_lossy().to_string(),
        };
        let result = cmd.execute(&guard).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_from_args() {
        let cmd = CopyFile::from_args(json!({
            "source": "/original.txt",
            "destination": "/copy.txt"
        })).unwrap();
        assert_eq!(cmd.source, "/original.txt");
        assert_eq!(cmd.destination, "/copy.txt");
    }
}
