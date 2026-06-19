use std::path::{Path, PathBuf};

#[derive(Debug, thiserror::Error)]
pub enum PathGuardError {
    #[error("path outside any allowed workspace")]
    OutsideAllowlist,
    #[error("path traversal detected")]
    TraversalAttempt,
    #[error("symlink escapes allowed workspace")]
    SymlinkEscape,
    #[error("denied extension: {0}")]
    DeniedExtension(String),
    #[error("path does not exist or is inaccessible")]
    NotAccessible,
}

pub struct PathGuard {
    canonical_roots: Vec<PathBuf>,
    raw_roots: Vec<PathBuf>,
    denied_extensions: Vec<String>,
}

impl PathGuard {
    pub fn new(allowed_roots: Vec<PathBuf>, denied_extensions: Vec<String>) -> Self {
        let canonical_roots: Vec<PathBuf> = allowed_roots.iter()
            .filter_map(|r| r.canonicalize().ok())
            .collect();
        Self {
            canonical_roots,
            raw_roots: allowed_roots,
            denied_extensions,
        }
    }

    /// Resolve and validate a path against the allowed roots.
    /// Rules applied IN ORDER, all mandatory:
    /// 1. Canonicalize (resolves "..", symlinks, ".")
    /// 2. Verify canonical path starts with an allowed root
    /// 3. Re-check symlink escape explicitly for logging
    /// 4. Denied extension check
    pub fn validate(&self, requested: &Path) -> Result<PathBuf, PathGuardError> {
        if !requested.exists() {
            return Err(PathGuardError::NotAccessible);
        }

        // 1. Canonicalize
        let canonical = requested
            .canonicalize()
            .map_err(|_| PathGuardError::OutsideAllowlist)?;

        // 2. Verify inside an allowed root
        let is_inside = self.canonical_roots.iter().any(|root| canonical.starts_with(root));
        if !is_inside {
            return Err(PathGuardError::OutsideAllowlist);
        }

        // 3. Anti symlink-escape: if requested is a symlink, its target must
        //    also stay within the matching root. canonicalize() already resolved it,
        //    but we validate explicitly for audit logging.
        if requested.is_symlink() {
            let matching_root = self.matching_canonical_root(&canonical);
            if let Some(root) = matching_root {
                if !canonical.starts_with(&root) {
                    return Err(PathGuardError::SymlinkEscape);
                }
            } else {
                return Err(PathGuardError::SymlinkEscape);
            }
        }

        // 4. Denied extension — even for READ operations
        if let Some(ext) = canonical.extension().and_then(|e| e.to_str()) {
            let ext_lower = format!(".{}", ext.to_lowercase());
            if self.denied_extensions.contains(&ext_lower) {
                return Err(PathGuardError::DeniedExtension(ext_lower));
            }
        }

        Ok(canonical)
    }

    /// Pure path-string validation without touching the filesystem.
    /// Useful for validating paths before creation (file doesn't exist yet).
    pub fn validate_path_only(&self, requested: &Path) -> Result<PathBuf, PathGuardError> {
        // Resolve ".." and "." components lexically
        let resolved = self.resolve_relative(requested);
        let resolved = self.normalize_path(&resolved);

        let is_inside = self.raw_roots.iter().any(|root| resolved.starts_with(root));
        if !is_inside {
            return Err(PathGuardError::OutsideAllowlist);
        }

        // Check for traversal attempts in the path string
        if requested.components().any(|c| c.as_os_str() == "..") {
            if !is_inside {
                return Err(PathGuardError::TraversalAttempt);
            }
        }

        // Denied extension check
        if let Some(ext) = resolved.extension().and_then(|e| e.to_str()) {
            let ext_lower = format!(".{}", ext.to_lowercase());
            if self.denied_extensions.contains(&ext_lower) {
                return Err(PathGuardError::DeniedExtension(ext_lower));
            }
        }

        Ok(resolved)
    }

    fn matching_canonical_root(&self, path: &Path) -> Option<PathBuf> {
        self.canonical_roots.iter()
            .find(|root| path.starts_with(root))
            .cloned()
    }

    fn resolve_relative(&self, requested: &Path) -> PathBuf {
        if requested.is_relative() {
            if let Some(root) = self.longest_raw_root() {
                return root.join(requested);
            }
        }
        requested.to_path_buf()
    }

    fn longest_raw_root(&self) -> Option<PathBuf> {
        self.raw_roots.iter()
            .max_by_key(|r| r.components().count())
            .cloned()
    }

    /// Simple path normalization without canonicalize (doesn't touch filesystem).
    fn normalize_path(&self, path: &Path) -> PathBuf {
        let mut components = Vec::new();
        for component in path.components() {
            match component.as_os_str().to_str() {
                Some(".") => continue,
                Some("..") => {
                    if components.pop().is_none() {
                        // If we can't pop (empty), just skip — can't escape above root
                    }
                }
                _ => components.push(component.as_os_str().to_os_string()),
            }
        }
        let mut result = PathBuf::new();
        for c in components {
            result.push(c);
        }
        result
    }

    pub fn canonical_roots(&self) -> &[PathBuf] {
        &self.canonical_roots
    }

    pub fn raw_roots(&self) -> &[PathBuf] {
        &self.raw_roots
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::env;

    fn setup_test_dir() -> (tempfile::TempDir, PathBuf) {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().to_path_buf();
        // Create a subdirectory
        fs::create_dir_all(root.join("subdir")).unwrap();
        fs::write(root.join("test.txt"), "hello").unwrap();
        fs::write(root.join("subdir").join("nested.txt"), "nested").unwrap();
        (dir, root)
    }

    #[test]
    fn test_validate_allowed_path() {
        let (_dir, root) = setup_test_dir();
        let guard = PathGuard::new(vec![root.clone()], vec![]);
        let result = guard.validate(&root.join("test.txt"));
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_outside_allowlist() {
        let (_dir, root) = setup_test_dir();
        let guard = PathGuard::new(vec![root.join("subdir")], vec![]);
        let result = guard.validate(&root.join("test.txt"));
        assert!(matches!(result, Err(PathGuardError::OutsideAllowlist)));
    }

    #[test]
    fn test_validate_denied_extension() {
        let (_dir, root) = setup_test_dir();
        fs::write(root.join("script.exe"), "fake").unwrap();
        let guard = PathGuard::new(vec![root.clone()], vec![".exe".into()]);
        let result = guard.validate(&root.join("script.exe"));
        assert!(matches!(result, Err(PathGuardError::DeniedExtension(ext)) if ext == ".exe"));
    }

    #[test]
    fn test_validate_nonexistent_path() {
        let (_dir, root) = setup_test_dir();
        let guard = PathGuard::new(vec![root.clone()], vec![]);
        let result = guard.validate(&root.join("nonexistent.txt"));
        assert!(matches!(result, Err(PathGuardError::NotAccessible)));
    }

    #[test]
    fn test_path_traversal_rejected() {
        let (_dir, root) = setup_test_dir();
        // Create a file outside root by traversal
        let outside = env::temp_dir().join("geonexus_traversal_test.txt");
        let _ = fs::write(&outside, "should not be accessible");
        let guard = PathGuard::new(vec![root.clone()], vec![]);
        // Direct access should fail
        let result = guard.validate(&outside);
        assert!(matches!(result, Err(PathGuardError::OutsideAllowlist)));
        let _ = fs::remove_file(&outside);
    }

    #[test]
    fn test_validate_path_only_creation() {
        let guard = PathGuard::new(
            vec![PathBuf::from("D:/Workspace")],
            vec![".exe".into()],
        );
        // Valid path
        let result = guard.validate_path_only(&Path::new("D:/Workspace/new_project/src/main.rs"));
        assert!(result.is_ok());

        // Outside allowlist
        let result = guard.validate_path_only(&Path::new("D:/Other/file.txt"));
        assert!(matches!(result, Err(PathGuardError::OutsideAllowlist)));

        // Denied extension
        let result = guard.validate_path_only(&Path::new("D:/Workspace/evil.exe"));
        assert!(matches!(result, Err(PathGuardError::DeniedExtension(_))));
    }

    #[test]
    fn test_validate_path_only_traversal() {
        let guard = PathGuard::new(
            vec![PathBuf::from("D:/Workspace")],
            vec![],
        );
        // Traversal that stays inside -> should be rejected because after normalization it might still be inside
        // Actually, traversal with ".." inside the workspace resolves fine
        let result = guard.validate_path_only(&Path::new("D:/Workspace/subdir/../file.txt"));
        assert!(result.is_ok());
        let resolved = result.unwrap();
        assert_eq!(resolved, PathBuf::from("D:/Workspace/file.txt"));
    }

    #[test]
    fn test_symlink_escape_detected_with_real_symlink() {
        let (_dir, root) = setup_test_dir();
        let outside_file = env::temp_dir().join("geonexus_symlink_target.txt");
        let _ = fs::write(&outside_file, "secret data");

        // Symlink inside workspace -> outside target
        let symlink_path = root.join("escape_link.txt");

        // Attempt to create symlink; skip test if platform doesn't support it
        #[cfg(target_family = "unix")]
        {
            std::os::unix::fs::symlink(&outside_file, &symlink_path).unwrap();
            let guard = PathGuard::new(vec![root.clone()], vec![]);
            let result = guard.validate(&symlink_path);
            // After canonicalization, the symlink resolves to outside_file which is outside root
            assert!(matches!(result, Err(PathGuardError::OutsideAllowlist)));
        }

        #[cfg(target_family = "windows")]
        {
            // Try creating symlink; skip if not supported
            if std::os::windows::fs::symlink_file(&outside_file, &symlink_path).is_ok() {
                let guard = PathGuard::new(vec![root.clone()], vec![]);
                let result = guard.validate(&symlink_path);
                assert!(matches!(result, Err(PathGuardError::OutsideAllowlist)));
                let _ = fs::remove_file(&symlink_path);
            }
        }

        let _ = fs::remove_file(&outside_file);
    }

    #[test]
    fn test_path_traversal_dotdot_etc_passwd() {
        let (_dir, root) = setup_test_dir();
        let guard = PathGuard::new(vec![root.clone()], vec![]);
        // This path traverses up beyond the root with ../../../
        let traversal = root.join("../../../etc/passwd");
        let result = guard.validate(&traversal);
        // On Unix the path may resolve and be rejected as OutsideAllowlist;
        // on Windows canonicalize fails with NotAccessible since the path doesn't exist
        assert!(
            matches!(result, Err(PathGuardError::OutsideAllowlist))
                || matches!(result, Err(PathGuardError::NotAccessible)),
            "expected OutsideAllowlist or NotAccessible, got {:?}",
            result
        );
    }

    #[test]
    fn test_unc_path_outside_allowlist() {
        let (_dir, root) = setup_test_dir();
        let guard = PathGuard::new(vec![root.clone()], vec![]);
        // UNC paths are outside the allowed workspace
        let unc = Path::new(r"\\server\share\file.txt");
        let result = guard.validate(unc);
        let err = result.unwrap_err();
        assert!(matches!(err, PathGuardError::NotAccessible));
    }

    #[test]
    fn test_multiple_allowed_roots() {
        let (_dir, root) = setup_test_dir();
        let root2 = env::temp_dir().join("geonexus_root2_test");
        let _ = fs::create_dir_all(&root2);
        fs::write(root2.join("data.csv"), "a,b,c").unwrap();

        let guard = PathGuard::new(
            vec![root.clone(), root2.clone()],
            vec![],
        );

        assert!(guard.validate(&root.join("test.txt")).is_ok());
        assert!(guard.validate(&root2.join("data.csv")).is_ok());

        let _ = fs::remove_dir_all(&root2);
    }

    #[test]
    fn test_empty_roots_rejects_all() {
        let (_dir, root) = setup_test_dir();
        let guard = PathGuard::new(vec![], vec![]);
        let result = guard.validate(&root.join("test.txt"));
        assert!(result.is_err());
    }
}
