use async_trait::async_trait;
use serde_json::json;
use std::path::Path;

use crate::commands::{Command, ToolResult, FsMcpError, arg_string};
use crate::security::level_guard::PermissionLevel;
use crate::security::path_guard::PathGuard;
use crate::analyzer::framework_detect::FrameworkDetect;

pub struct DetectFramework {
    path: String,
    deep: bool,
}

impl DetectFramework {
    pub fn from_args(args: serde_json::Value) -> Result<Self, FsMcpError> {
        Ok(Self {
            path: arg_string(&args, "path")?,
            deep: args.get("deep").and_then(|v| v.as_bool()).unwrap_or(false),
        })
    }
}

#[async_trait]
impl Command for DetectFramework {
    fn name(&self) -> &'static str {
        "detectFramework"
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
                "detected": false,
                "frameworks": [],
                "message": "path is not a directory"
            })));
        }

        let frameworks = if self.deep {
            FrameworkDetect::detect(&canonical)
        } else {
            FrameworkDetect::detect_single(&canonical)
                .map(|fw| vec![fw])
                .unwrap_or_default()
        };

        let primary = frameworks.first().map(|fw| fw.name.clone());

        Ok(ToolResult::ok(json!({
            "detected": !frameworks.is_empty(),
            "frameworks": frameworks,
            "primary": primary,
            "deep": self.deep,
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
        let cmd = DetectFramework::from_args(&json!({"path": "/test"})).unwrap();
        assert_eq!(cmd.path, "/test");
        assert!(!cmd.deep);
    }

    #[test]
    fn test_from_args_with_deep() {
        let cmd = DetectFramework::from_args(&json!({"path": "/test", "deep": true})).unwrap();
        assert!(cmd.deep);
    }

    #[tokio::test]
    async fn test_detect_framework_rust() {
        let dir = TempDir::new().unwrap();
        std::fs::write(dir.path().join("Cargo.toml"), r#"[package]
name = "test-crate"
version = "0.1.0"

[dependencies]
serde = "1"
"#).unwrap();

        let guard = PathGuard::new(vec![dir.path().to_path_buf()], vec![]);
        let cmd = DetectFramework::from_args(&json!({"path": dir.path().to_string_lossy().to_string()})).unwrap();
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.data["detected"].as_bool().unwrap());
        assert_eq!(result.data["primary"].as_str().unwrap(), "test-crate");
    }

    #[tokio::test]
    async fn test_detect_framework_empty_dir() {
        let dir = TempDir::new().unwrap();
        let guard = PathGuard::new(vec![dir.path().to_path_buf()], vec![]);
        let cmd = DetectFramework::from_args(&json!({"path": dir.path().to_string_lossy().to_string()})).unwrap();
        let result = cmd.execute(&guard).await.unwrap();
        assert!(!result.data["detected"].as_bool().unwrap());
    }
}
