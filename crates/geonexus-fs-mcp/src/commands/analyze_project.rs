use async_trait::async_trait;
use serde_json::json;
use std::path::Path;

use crate::commands::{Command, ToolResult, FsMcpError, arg_string};
use crate::security::level_guard::PermissionLevel;
use crate::security::path_guard::PathGuard;
use crate::analyzer::framework_detect::FrameworkDetect;

pub struct AnalyzeProject {
    path: String,
}

impl AnalyzeProject {
    pub fn from_args(args: serde_json::Value) -> Result<Self, FsMcpError> {
        Ok(Self {
            path: arg_string(&args, "path")?,
        })
    }
}

#[async_trait]
impl Command for AnalyzeProject {
    fn name(&self) -> &'static str {
        "analyzeProject"
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
            return Ok(ToolResult::ok(json!({
                "error": "path is not a directory",
                "path": self.path,
            })));
        }

        let analysis = FrameworkDetect::analyze(&canonical);

        Ok(ToolResult::ok(serde_json::to_value(analysis)
            .unwrap_or_else(|_| json!({"error": "serialization failed"}))))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::TempDir;

    #[test]
    fn test_from_args() {
        let cmd = AnalyzeProject::from_args(&json!({"path": "/test"})).unwrap();
        assert_eq!(cmd.path, "/test");
    }

    #[tokio::test]
    async fn test_analyze_basic() {
        let dir = TempDir::new().unwrap();
        std::fs::write(dir.path().join("main.rs"), "fn main() {}").unwrap();
        std::fs::create_dir(dir.path().join("src")).unwrap();
        std::fs::write(dir.path().join("Cargo.toml"), r#"[package]
name = "test-crate"
version = "0.1.0"
[dependencies]
"#).unwrap();

        let guard = PathGuard::new(vec![dir.path().to_path_buf()], vec![]);
        let cmd = AnalyzeProject::from_args(&json!({"path": dir.path().to_string_lossy().to_string()})).unwrap();
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        assert!(result.data["file_count"].as_u64().unwrap_or(0) >= 1);
        assert!(result.data["has_git"].as_bool().is_some());
        assert!(!result.data["frameworks"].as_array().unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_analyze_file_not_dir() {
        let dir = TempDir::new().unwrap();
        let file_path = dir.path().join("file.txt");
        std::fs::write(&file_path, "hello").unwrap();

        let guard = PathGuard::new(vec![dir.path().to_path_buf()], vec![]);
        let cmd = AnalyzeProject::from_args(&json!({"path": file_path.to_string_lossy().to_string()})).unwrap();
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.data["error"].as_str().is_some());
    }
}
