use std::collections::HashMap;
use std::path::Path;

#[derive(Debug, thiserror::Error)]
pub enum LevelGuardError {
    #[error("no permission level configured for path")]
    NoLevelForPath,
    #[error("insufficient permission level: required {required}, actual {actual}")]
    InsufficientLevel { required: String, actual: String },
}

/// Permission levels in strictly hierarchical order.
/// Each level is a strict superset of the previous.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum PermissionLevel {
    Read,
    Write,
    Execute,
    Admin,
}

impl PermissionLevel {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "read" => Some(Self::Read),
            "write" => Some(Self::Write),
            "execute" => Some(Self::Execute),
            "admin" => Some(Self::Admin),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Read => "read",
            Self::Write => "write",
            Self::Execute => "execute",
            Self::Admin => "admin",
        }
    }

    pub fn required_for_tool(tool_name: &str) -> Option<Self> {
        match tool_name {
            // Read operations
            "listDirectories" | "listFiles" | "searchFiles"
            | "readFile" | "analyzeProject" | "detectFramework"
                => Some(Self::Read),

            // Write operations
            "createFolder" | "createFile" | "updateFile"
            | "copyFile"
                => Some(Self::Write),

            // Execute operations
            "executeCommand" | "installDependency" | "gitClone"
                => Some(Self::Execute),

            // Admin operations
            "deleteFile" | "deleteFolder" | "moveFile"
            | "createProject"
                => Some(Self::Admin),

            // Unknown tool — require admin to be safe
            _ => Some(Self::Admin),
        }
    }
}

pub struct LevelGuard {
    path_levels: HashMap<String, PermissionLevel>,
    default_level: PermissionLevel,
}

impl LevelGuard {
    pub fn new(path_levels: &HashMap<String, String>) -> Self {
        let parsed: HashMap<String, PermissionLevel> = path_levels.iter()
            .filter_map(|(path, level)| {
                PermissionLevel::from_str(level).map(|l| (path.clone(), l))
            })
            .collect();
        Self {
            path_levels: parsed,
            default_level: PermissionLevel::Read,
        }
    }

    pub fn with_default(mut self, level: PermissionLevel) -> Self {
        self.default_level = level;
        self
    }

    /// Check if the path's permission level allows the requested tool.
    pub fn check(&self, path: &Path, tool_name: &str) -> Result<(), LevelGuardError> {
        let required = PermissionLevel::required_for_tool(tool_name)
            .ok_or_else(|| LevelGuardError::InsufficientLevel {
                required: tool_name.to_string(),
                actual: "unknown".into(),
            })?;

        let actual = self.level_for_path(path)
            .unwrap_or(self.default_level.clone());

        if actual < required {
            return Err(LevelGuardError::InsufficientLevel {
                required: required.as_str().to_string(),
                actual: actual.as_str().to_string(),
            });
        }

        Ok(())
    }

    fn level_for_path(&self, path: &Path) -> Option<PermissionLevel> {
        let path_str = path.to_string_lossy();
        let mut best: Option<PermissionLevel> = None;
        let mut best_len = 0usize;

        for (allowed, level) in &self.path_levels {
            if path_str.starts_with(allowed.as_str()) {
                let len = allowed.len();
                if len > best_len {
                    best = Some(level.clone());
                    best_len = len;
                }
            }
        }

        best
    }

    pub fn default_level(&self) -> &PermissionLevel {
        &self.default_level
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_levels() -> HashMap<String, String> {
        let mut m = HashMap::new();
        m.insert("D:/Projects".into(), "write".into());
        m.insert("D:/Projects/secret".into(), "read".into());
        m.insert("D:/GIS".into(), "read".into());
        m
    }

    #[test]
    fn test_level_guard_allows_read_on_read_path() {
        let guard = LevelGuard::new(&make_levels());
        let result = guard.check(&Path::new("D:/GIS/map.shp"), "listFiles");
        assert!(result.is_ok());
    }

    #[test]
    fn test_level_guard_denies_write_on_read_path() {
        let guard = LevelGuard::new(&make_levels());
        let result = guard.check(&Path::new("D:/GIS/map.shp"), "createFile");
        assert!(matches!(result, Err(LevelGuardError::InsufficientLevel { .. })));
    }

    #[test]
    fn test_level_guard_allows_write_on_write_path() {
        let guard = LevelGuard::new(&make_levels());
        let result = guard.check(&Path::new("D:/Projects/app/main.rs"), "createFile");
        assert!(result.is_ok());
    }

    #[test]
    fn test_level_guard_denies_admin_on_write_path() {
        let guard = LevelGuard::new(&make_levels());
        let result = guard.check(&Path::new("D:/Projects/app/main.rs"), "deleteFile");
        assert!(matches!(result, Err(LevelGuardError::InsufficientLevel { .. })));
    }

    #[test]
    fn test_level_guard_uses_most_specific_path() {
        let guard = LevelGuard::new(&make_levels());
        // secret/ is read-only even though Projects/ is write
        let result = guard.check(&Path::new("D:/Projects/secret/key.txt"), "createFile");
        assert!(matches!(result, Err(LevelGuardError::InsufficientLevel { .. })));
        // But read works on secret/
        let result = guard.check(&Path::new("D:/Projects/secret/key.txt"), "readFile");
        assert!(result.is_ok());
    }

    #[test]
    fn test_level_guard_default_for_unknown_path() {
        let guard = LevelGuard::new(&HashMap::new());
        let result = guard.check(&Path::new("D:/Unknown/file.txt"), "listFiles");
        assert!(result.is_ok()); // read by default
    }

    #[test]
    fn test_permission_level_ordering() {
        assert!(PermissionLevel::Read < PermissionLevel::Write);
        assert!(PermissionLevel::Write < PermissionLevel::Execute);
        assert!(PermissionLevel::Execute < PermissionLevel::Admin);
        assert!(PermissionLevel::Read < PermissionLevel::Admin);
    }

    #[test]
    fn test_required_for_tool() {
        assert_eq!(PermissionLevel::required_for_tool("listFiles"), Some(PermissionLevel::Read));
        assert_eq!(PermissionLevel::required_for_tool("createFile"), Some(PermissionLevel::Write));
        assert_eq!(PermissionLevel::required_for_tool("executeCommand"), Some(PermissionLevel::Execute));
        assert_eq!(PermissionLevel::required_for_tool("deleteFile"), Some(PermissionLevel::Admin));
        assert_eq!(PermissionLevel::required_for_tool("unknown_tool"), Some(PermissionLevel::Admin));
    }
}
