use std::collections::HashMap;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AllowedPathEntry {
    pub path: String,
    pub level: String,
    #[serde(default = "default_added_at")]
    pub added_at: String,
    pub label: String,
}

fn default_added_at() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GlobalDefaults {
    #[serde(default = "default_level")]
    pub level: String,
    #[serde(default = "default_require_confirm")]
    pub require_confirm_for: Vec<String>,
    #[serde(default = "default_max_file_size_mb")]
    pub max_file_size_mb: u64,
    #[serde(default = "default_denied_extensions")]
    pub denied_extensions: Vec<String>,
}

fn default_level() -> String { "read".into() }
fn default_require_confirm() -> Vec<String> {
    vec!["delete".into(), "move".into(), "execute".into(), "overwrite".into()]
}
fn default_max_file_size_mb() -> u64 { 25 }
fn default_denied_extensions() -> Vec<String> {
    vec![".exe".into(), ".dll".into(), ".sh".into(), ".bat".into(), ".ps1".into(), ".so".into()]
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct IndexingConfig {
    #[serde(default = "default_indexing_enabled")]
    pub enabled: bool,
    #[serde(default = "default_exclude_dirs")]
    pub exclude_dirs: Vec<String>,
}

fn default_indexing_enabled() -> bool { true }
fn default_exclude_dirs() -> Vec<String> {
    vec![
        "node_modules".into(), ".git".into(), "dist".into(),
        "build".into(), "__pycache__".into(), ".venv".into(),
    ]
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FilesystemConfig {
    pub version: i32,
    #[serde(default)]
    pub allowed_paths: Vec<AllowedPathEntry>,
    #[serde(default)]
    pub global_defaults: GlobalDefaults,
    #[serde(default)]
    pub indexing: IndexingConfig,
}

impl Default for FilesystemConfig {
    fn default() -> Self {
        Self {
            version: 1,
            allowed_paths: Vec::new(),
            global_defaults: GlobalDefaults::default(),
            indexing: IndexingConfig::default(),
        }
    }
}

impl Default for GlobalDefaults {
    fn default() -> Self {
        Self {
            level: default_level(),
            require_confirm_for: default_require_confirm(),
            max_file_size_mb: default_max_file_size_mb(),
            denied_extensions: default_denied_extensions(),
        }
    }
}

impl Default for IndexingConfig {
    fn default() -> Self {
        Self {
            enabled: default_indexing_enabled(),
            exclude_dirs: default_exclude_dirs(),
        }
    }
}

impl FilesystemConfig {
    pub fn config_dir() -> PathBuf {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".into());
        PathBuf::from(home).join(".geonexus")
    }

    pub fn config_path() -> PathBuf {
        Self::config_dir().join("filesystem.config.json")
    }

    pub fn load() -> Result<Self, ConfigError> {
        let path = Self::config_path();
        if !path.exists() {
            return Ok(Self::default());
        }
        let content = std::fs::read_to_string(&path)
            .map_err(|e| ConfigError::Io(e.to_string()))?;
        let config: FilesystemConfig = serde_json::from_str(&content)
            .map_err(|e| ConfigError::Parse(e.to_string()))?;
        config.validate()?;
        Ok(config)
    }

    pub fn save(&self) -> Result<(), ConfigError> {
        let dir = Self::config_dir();
        std::fs::create_dir_all(&dir)
            .map_err(|e| ConfigError::Io(e.to_string()))?;
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| ConfigError::Serialize(e.to_string()))?;
        std::fs::write(Self::config_path(), content)
            .map_err(|e| ConfigError::Io(e.to_string()))?;
        Ok(())
    }

    pub fn validate(&self) -> Result<(), ConfigError> {
        if self.version < 1 {
            return Err(ConfigError::Validation("version must be >= 1".into()));
        }
        let valid_levels = ["read", "write", "execute", "admin"];
        for entry in &self.allowed_paths {
            if !valid_levels.contains(&entry.level.as_str()) {
                return Err(ConfigError::Validation(
                    format!("invalid permission level '{}' for path '{}'", entry.level, entry.path)
                ));
            }
            if entry.path.is_empty() {
                return Err(ConfigError::Validation("allowed_path entry with empty path".into()));
            }
        }
        if !valid_levels.contains(&self.global_defaults.level.as_str()) {
            return Err(ConfigError::Validation(
                format!("invalid global default level '{}'", self.global_defaults.level)
            ));
        }
        let valid_actions = ["delete", "move", "overwrite", "execute"];
        for action in &self.global_defaults.require_confirm_for {
            if !valid_actions.contains(&action.as_str()) {
                return Err(ConfigError::Validation(
                    format!("invalid confirm action '{}'", action)
                ));
            }
        }
        if self.global_defaults.max_file_size_mb == 0 {
            return Err(ConfigError::Validation("max_file_size_mb must be > 0".into()));
        }
        Ok(())
    }

    pub fn allowed_paths_map(&self) -> HashMap<String, String> {
        self.allowed_paths.iter()
            .map(|e| (e.path.clone(), e.level.clone()))
            .collect()
    }

    pub fn level_for_path(&self, path: &str) -> Option<String> {
        // Find the most specific (longest) matching allowed path
        let canonical = Path::new(path);
        let mut best: Option<&AllowedPathEntry> = None;
        let mut best_len = 0usize;
        for entry in &self.allowed_paths {
            let root = Path::new(&entry.path);
            if canonical.starts_with(root) {
                let root_len = root.components().count();
                if root_len > best_len {
                    best = Some(entry);
                    best_len = root_len;
                }
            }
        }
        best.map(|e| e.level.clone())
    }

    pub fn contains_path(&self, path: &str) -> bool {
        let canonical = Path::new(path);
        self.allowed_paths.iter().any(|e| {
            let root = Path::new(&e.path);
            canonical.starts_with(root)
        })
    }

    pub fn denied_extensions(&self) -> &[String] {
        &self.global_defaults.denied_extensions
    }

    pub fn max_file_size(&self) -> u64 {
        self.global_defaults.max_file_size_mb * 1024 * 1024
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("IO error: {0}")]
    Io(String),
    #[error("JSON parse error: {0}")]
    Parse(String),
    #[error("JSON serialize error: {0}")]
    Serialize(String),
    #[error("Validation error: {0}")]
    Validation(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_default() {
        let config = FilesystemConfig::default();
        assert_eq!(config.version, 1);
        assert!(config.allowed_paths.is_empty());
        assert_eq!(config.global_defaults.level, "read");
        assert!(config.global_defaults.denied_extensions.contains(&".exe".into()));
    }

    #[test]
    fn test_config_validate_valid() {
        let config = FilesystemConfig::default();
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_config_validate_invalid_level() {
        let mut config = FilesystemConfig::default();
        config.allowed_paths.push(AllowedPathEntry {
            path: "/test".into(),
            level: "superadmin".into(),
            added_at: "".into(),
            label: "test".into(),
        });
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_config_validate_empty_path() {
        let mut config = FilesystemConfig::default();
        config.allowed_paths.push(AllowedPathEntry {
            path: "".into(),
            level: "read".into(),
            added_at: "".into(),
            label: "empty".into(),
        });
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_config_validate_bad_global_level() {
        let mut config = FilesystemConfig::default();
        config.global_defaults.level = "none".into();
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_config_level_for_path() {
        let mut config = FilesystemConfig::default();
        config.allowed_paths.push(AllowedPathEntry {
            path: "/home/projects".into(),
            level: "write".into(),
            added_at: "".into(),
            label: "Projects".into(),
        });
        config.allowed_paths.push(AllowedPathEntry {
            path: "/home/projects/secret".into(),
            level: "read".into(),
            added_at: "".into(),
            label: "Secret".into(),
        });
        assert_eq!(config.level_for_path("/home/projects/foo").unwrap(), "write");
        assert_eq!(config.level_for_path("/home/projects/secret/bar").unwrap(), "read");
        assert!(config.level_for_path("/other").is_none());
    }

    #[test]
    fn test_config_contains_path() {
        let mut config = FilesystemConfig::default();
        config.allowed_paths.push(AllowedPathEntry {
            path: "D:/Workspace".into(),
            level: "read".into(),
            added_at: "".into(),
            label: "Ws".into(),
        });
        assert!(config.contains_path("D:/Workspace/project"));
        assert!(!config.contains_path("D:/Other"));
    }

    #[test]
    fn test_config_max_file_size() {
        let config = FilesystemConfig::default();
        assert_eq!(config.max_file_size(), 25 * 1024 * 1024);
    }

    #[test]
    fn test_config_save_load_roundtrip() {
        use std::env;
        let tmp = env::temp_dir().join("geonexus_fs_test");
        let _ = std::fs::remove_dir_all(&tmp);
        // Temporarily override config path by setting HOME
        env::set_var("HOME", tmp.to_str().unwrap());
        // Re-create default config with a path
        let mut config = FilesystemConfig::default();
        config.allowed_paths.push(AllowedPathEntry {
            path: "D:/Test".into(),
            level: "write".into(),
            added_at: "now".into(),
            label: "Test".into(),
        });
        assert!(config.save().is_ok());
        let loaded = FilesystemConfig::load().unwrap();
        assert_eq!(loaded.allowed_paths.len(), 1);
        assert_eq!(loaded.allowed_paths[0].path, "D:/Test");
        let _ = std::fs::remove_dir_all(&tmp);
    }
}
