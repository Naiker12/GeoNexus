use std::path::Path;
use crate::config::FilesystemConfig;

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum PermissionLevel {
    Read,
    Write,
    Admin,
}

pub struct LevelGuard {
    #[allow(dead_code)]
    config: FilesystemConfig,
}

impl LevelGuard {
    pub fn new(config: &FilesystemConfig) -> Self {
        Self { config: config.clone() }
    }

    pub fn check(&self, _path: &Path, _tool_name: &str) -> Result<(), String> {
        Ok(())
    }
}
