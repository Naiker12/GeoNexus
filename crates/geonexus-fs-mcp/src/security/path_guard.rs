use crate::config::FilesystemConfig;
use std::path::{Path, PathBuf};

pub struct PathGuard {
    allowed: Vec<PathBuf>,
    #[allow(dead_code)]
    excluded: Vec<PathBuf>,
}

impl PathGuard {
    pub fn new(allowed: Vec<PathBuf>, excluded: Vec<PathBuf>) -> Self {
        Self { allowed, excluded }
    }

    pub fn from_config(config: &FilesystemConfig) -> Self {
        let allowed: Vec<PathBuf> = config.allowed_paths.iter().map(|e| PathBuf::from(&e.path)).collect();
        Self { allowed, excluded: vec![] }
    }

    pub fn is_path_allowed(&self, path: &Path) -> bool {
        self.allowed.iter().any(|a| path.starts_with(a))
    }

    pub fn validate(&self, path: &Path) -> Result<PathBuf, super::super::commands::FsMcpError> {
        if self.is_path_allowed(path) {
            Ok(path.to_path_buf())
        } else {
            Err(super::super::commands::FsMcpError::Permission(format!(
                "path '{}' is not in allowed directories", path.display()
            )))
        }
    }

    pub fn validate_path_only(&self, path: &Path) -> Result<PathBuf, super::super::commands::FsMcpError> {
        self.validate(path)
    }

    pub fn raw_roots(&self) -> &[PathBuf] {
        &self.allowed
    }
}
