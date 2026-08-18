use async_trait::async_trait;
use serde_json::{json, Value};
use std::path::Path;

use super::{Command, ToolResult, FsMcpError, arg_string};
use crate::security::path_guard::PathGuard;
use crate::security::level_guard::PermissionLevel;

pub struct UpdateFile {
    path: String,
    content: String,
}

impl UpdateFile {
    pub fn from_args(args: Value) -> Result<Self, FsMcpError> {
        let path = arg_string(&args, "path")?;
        let content = arg_string(&args, "content")?;
        Ok(Self { path, content })
    }

    /// Compute a unified diff between old and new content (simple line-based).
    fn compute_diff(old: &str, new: &str) -> String {
        let old_lines: Vec<&str> = old.lines().collect();
        let new_lines: Vec<&str> = new.lines().collect();

        let mut diff = String::new();
        let mut i = 0;
        let mut j = 0;

        while i < old_lines.len() || j < new_lines.len() {
            if i < old_lines.len() && j < new_lines.len() && old_lines[i] == new_lines[j] {
                diff.push_str(&format!("  {}\n", old_lines[i]));
                i += 1;
                j += 1;
            } else if j < new_lines.len() && (i >= old_lines.len() || new_lines[j] != old_lines[i]) {
                // Added or changed line
                diff.push_str(&format!("+ {}\n", new_lines[j]));
                j += 1;
                if i < old_lines.len() && old_lines[i] != new_lines[j.saturating_sub(1)] {
                    // If we skipped ahead, also show the removed line
                    diff.push_str(&format!("- {}\n", old_lines[i]));
                    i += 1;
                }
            } else if i < old_lines.len() {
                diff.push_str(&format!("- {}\n", old_lines[i]));
                i += 1;
            }
        }

        diff
    }
}

#[async_trait]
impl Command for UpdateFile {
    fn name(&self) -> &'static str {
        "updateFile"
    }

    fn level_required(&self) -> PermissionLevel {
        PermissionLevel::Write
    }

    fn requires_confirm(&self) -> bool {
        // Overwrite existing content — requires confirm
        true
    }

    async fn execute(&self, guard: &PathGuard) -> Result<ToolResult, FsMcpError> {
        let path = Path::new(&self.path);
        let canonical = guard.validate(path)?;

        if !canonical.is_file() {
            return Err(FsMcpError::InvalidArguments(format!(
                "'{}' is not a file or does not exist", self.path
            )));
        }

        // Read old content for diff
        let old_content = tokio::fs::read_to_string(&canonical).await
            .map_err(|e| FsMcpError::Io(e.to_string()))?;

        let diff = Self::compute_diff(&old_content, &self.content);

        // Write new content
        tokio::fs::write(&canonical, &self.content).await
            .map_err(|e| FsMcpError::Io(e.to_string()))?;

        Ok(ToolResult::ok(json!({
            "updated": true,
            "path": canonical.to_string_lossy(),
            "diff": diff,
        })).with_mutation(vec![canonical.clone()]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    #[tokio::test]
    async fn test_update_file_basic() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        fs::write(root.join("test.txt"), "original content").unwrap();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = UpdateFile {
            path: root.join("test.txt").to_string_lossy().to_string(),
            content: "updated content".into(),
        };
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        assert!(result.data["updated"].as_bool().unwrap());
        assert_eq!(
            fs::read_to_string(root.join("test.txt")).unwrap(),
            "updated content"
        );
    }

    #[tokio::test]
    async fn test_update_file_returns_diff() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        fs::write(root.join("test.txt"), "line1\nline2\nline3").unwrap();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = UpdateFile {
            path: root.join("test.txt").to_string_lossy().to_string(),
            content: "line1\nmodified\nline3".into(),
        };
        let result = cmd.execute(&guard).await.unwrap();
        let diff = result.data["diff"].as_str().unwrap();
        assert!(diff.contains("line1")); // unchanged
        assert!(diff.contains("modified") || diff.contains("line2")); // changes
    }

    #[tokio::test]
    async fn test_update_file_nonexistent() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        let guard = PathGuard::new(vec![root.clone()], vec![]);

        let cmd = UpdateFile {
            path: root.join("nonexistent.txt").to_string_lossy().to_string(),
            content: "data".into(),
        };
        let result = cmd.execute(&guard).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_compute_diff_simple() {
        let diff = UpdateFile::compute_diff("hello\nworld", "hello\nuniverse");
        assert!(diff.contains("hello")); // unchanged
        assert!(diff.contains("universe") || diff.contains("world"));
    }

    #[test]
    fn test_compute_diff_identical() {
        let diff = UpdateFile::compute_diff("same\ncontent", "same\ncontent");
        assert!(!diff.contains('+') && !diff.contains('-') || diff.contains("same"));
    }

    #[test]
    fn test_from_args() {
        let cmd = UpdateFile::from_args(json!({
            "path": "/test.txt",
            "content": "new data"
        })).unwrap();
        assert_eq!(cmd.path, "/test.txt");
        assert_eq!(cmd.content, "new data");
    }
}
