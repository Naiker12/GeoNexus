use async_trait::async_trait;
use serde_json::json;
use std::path::Path;

use crate::commands::{Command, ToolResult, FsMcpError, arg_string, arg_optional_string};
use crate::security::level_guard::PermissionLevel;
use crate::security::path_guard::PathGuard;
use crate::analyzer::templates::TemplateFactory;

pub struct CreateProject {
    path: String,
    template: String,
    project_name: Option<String>,
}

impl CreateProject {
    pub fn from_args(args: &serde_json::Value) -> Result<Self, FsMcpError> {
        Ok(Self {
            path: arg_string(args, "path")?,
            template: arg_string(args, "template")?,
            project_name: arg_optional_string(args, "projectName"),
        })
    }
}

#[async_trait]
impl Command for CreateProject {
    fn name(&self) -> &'static str {
        "createProject"
    }

    fn level_required(&self) -> PermissionLevel {
        PermissionLevel::Write
    }

    fn requires_confirm(&self) -> bool {
        true
    }

    async fn execute(&self, guard: &PathGuard) -> Result<ToolResult, FsMcpError> {
        let path = Path::new(&self.path);
        let canonical = guard.validate_path_only(path)?;

        if canonical.exists() {
            return Err(FsMcpError::InvalidArguments(format!(
                "path already exists: {}",
                canonical.display()
            )));
        }

        // Look up template
        let mut template = TemplateFactory::find(&self.template)
            .ok_or_else(|| FsMcpError::InvalidArguments(format!("unknown template: {}", self.template)))?;

        // Override project name if provided
        if let Some(ref name) = self.project_name {
            template.name = name.clone();
        }

        // Create project files
        let created = TemplateFactory::create(&template, &canonical)
            .map_err(|e| FsMcpError::Io(e))?;

        let paths: Vec<std::path::PathBuf> = created.iter().map(|p| p.to_path_buf()).collect();

        Ok(ToolResult::ok(json!({
            "created": paths.iter().map(|p| p.to_string_lossy().to_string()).collect::<Vec<_>>(),
            "template": self.template,
            "project_name": template.name,
        })).with_mutation(paths))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::TempDir;

    #[test]
    fn test_from_args() {
        let cmd = CreateProject::from_args(&json!({
            "path": "/workspace/myapp",
            "template": "rust-bin"
        })).unwrap();
        assert_eq!(cmd.path, "/workspace/myapp");
        assert_eq!(cmd.template, "rust-bin");
        assert!(cmd.project_name.is_none());
    }

    #[test]
    fn test_from_args_with_name() {
        let cmd = CreateProject::from_args(&json!({
            "path": "/workspace/myapp",
            "template": "rust-bin",
            "projectName": "my-app"
        })).unwrap();
        assert_eq!(cmd.project_name.as_deref(), Some("my-app"));
    }

    #[tokio::test]
    async fn test_create_project_basic() {
        let dir = TempDir::new().unwrap();
        let project_dir = dir.path().join("my-bin");

        let guard = PathGuard::new(vec![dir.path().to_path_buf()], vec![]);
        let cmd = CreateProject::from_args(&json!({
            "path": project_dir.to_string_lossy().to_string(),
            "template": "rust-bin"
        })).unwrap();
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        assert!(result.mutated_fs);
        assert!(project_dir.join("Cargo.toml").exists());
        assert!(project_dir.join("src/main.rs").exists());
    }

    #[tokio::test]
    async fn test_create_project_already_exists() {
        let dir = TempDir::new().unwrap();
        let project_dir = dir.path().join("existing");
        std::fs::create_dir(&project_dir).unwrap();

        let guard = PathGuard::new(vec![dir.path().to_path_buf()], vec![]);
        let cmd = CreateProject::from_args(&json!({
            "path": project_dir.to_string_lossy().to_string(),
            "template": "rust-bin"
        })).unwrap();
        let result = cmd.execute(&guard).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_create_project_unknown_template() {
        let dir = TempDir::new().unwrap();
        let project_dir = dir.path().join("newproj");

        let guard = PathGuard::new(vec![dir.path().to_path_buf()], vec![]);
        let cmd = CreateProject::from_args(&json!({
            "path": project_dir.to_string_lossy().to_string(),
            "template": "nonexistent"
        })).unwrap();
        let result = cmd.execute(&guard).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("unknown template"));
    }
}
