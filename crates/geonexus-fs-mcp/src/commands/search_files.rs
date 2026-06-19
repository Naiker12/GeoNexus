use async_trait::async_trait;
use serde_json::{json, Value};
use std::path::Path;

use super::{Command, ToolResult, FsMcpError, arg_string, arg_optional_string_array, arg_optional_u64};
use crate::security::path_guard::PathGuard;
use crate::security::level_guard::PermissionLevel;

pub struct SearchFiles {
    query: String,
    scope: Option<String>,
    file_types: Option<Vec<String>>,
    limit: u64,
}

impl SearchFiles {
    pub fn from_args(args: Value) -> Result<Self, FsMcpError> {
        let query = arg_string(&args, "query")?;
        let scope = super::arg_optional_string(&args, "scope");
        let file_types = arg_optional_string_array(&args, "fileTypes");
        let limit = arg_optional_u64(&args, "limit").unwrap_or(20).min(100);
        Ok(Self { query, scope, file_types, limit })
    }

    /// Simple name-based search without index (direct scan limited to depth 3).
    /// The indexed version (FTS5 + embeddings) comes in F3.
    async fn scan_directory(
        &self,
        dir: &Path,
        guard: &PathGuard,
        depth: usize,
        results: &mut Vec<Value>,
    ) -> Result<(), FsMcpError> {
        if depth > 3 || results.len() >= self.limit as usize {
            return Ok(());
        }

        let query_lower = self.query.to_lowercase();

        let mut read_dir = match tokio::fs::read_dir(dir).await {
            Ok(rd) => rd,
            Err(_) => return Ok(()), // skip unreadable dirs
        };

        while let Some(entry) = read_dir.next_entry().await
            .map_err(|e| FsMcpError::Io(e.to_string()))?
        {
            if results.len() >= self.limit as usize {
                break;
            }

            let entry_path = entry.path();

            // Ensure we stay within allowed roots
            if guard.validate(&entry_path).is_err() {
                continue;
            }

            let ft = entry.file_type().await
                .map_err(|e| FsMcpError::Io(e.to_string()))?;

            let name = entry.file_name().to_string_lossy().to_string();
            let name_lower = name.to_lowercase();

            // Check file type filter
            if let Some(types) = &self.file_types {
                if ft.is_file() || ft.is_symlink() {
                    let ext = entry_path.extension()
                        .and_then(|e| e.to_str())
                        .map(|e| format!(".{}", e.to_lowercase()));
                    let matches = types.iter().any(|t| {
                        let t_lower = t.to_lowercase();
                        ext.as_deref() == Some(&t_lower)
                    });
                    if !matches {
                        continue;
                    }
                }
            }

            if ft.is_dir() {
                // Recurse into subdirectory
                Box::pin(self.scan_directory(&entry_path, guard, depth + 1, results)).await?;
            } else if name_lower.contains(&query_lower) {
                let path_str = entry_path.to_string_lossy().to_string();
                let score = compute_score(&name_lower, &query_lower);
                results.push(json!({
                    "path": path_str,
                    "score": score,
                    "snippet": name,
                }));
            }
        }

        Ok(())
    }
}

fn compute_score(name: &str, query: &str) -> f64 {
    let name = name.to_lowercase();
    let query = query.to_lowercase();
    if name == query {
        1.0
    } else if name.starts_with(&query) {
        0.8
    } else if name.contains(&query) {
        0.5
    } else {
        0.0
    }
}

#[async_trait]
impl Command for SearchFiles {
    fn name(&self) -> &'static str {
        "searchFiles"
    }

    fn level_required(&self) -> PermissionLevel {
        PermissionLevel::Read
    }

    fn requires_confirm(&self) -> bool {
        false
    }

    async fn execute(&self, guard: &PathGuard) -> Result<ToolResult, FsMcpError> {
        let mut results = Vec::new();

        // Determine which roots to search
        let search_roots: Vec<&std::path::PathBuf> = if let Some(scope_label) = &self.scope {
            // Find root matching the label — simple approach: match by label
            // For now, treat scope as a path prefix filter
            guard.raw_roots().iter()
                .filter(|r| r.to_string_lossy().to_lowercase().contains(&scope_label.to_lowercase()))
                .collect()
        } else {
            guard.raw_roots().iter().collect()
        };

        for root in search_roots {
            if results.len() >= self.limit as usize {
                break;
            }
            self.scan_directory(root, guard, 0, &mut results).await?;
        }

        // Sort by score descending, then by path
        results.sort_by(|a, b| {
            b["score"].as_f64().unwrap_or(0.0)
                .partial_cmp(&a["score"].as_f64().unwrap_or(0.0))
                .unwrap_or(std::cmp::Ordering::Equal)
                .then(a["path"].as_str().unwrap_or("").cmp(b["path"].as_str().unwrap_or("")))
        });

        results.truncate(self.limit as usize);

        Ok(ToolResult::ok(json!({ "results": results })))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn setup() -> (TempDir, PathGuard) {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();
        fs::write(root.join("main.rs"), "fn main() {}").unwrap();
        fs::write(root.join("README.md"), "# Project").unwrap();
        fs::write(root.join("data.json"), "{}").unwrap();
        fs::create_dir_all(root.join("src")).unwrap();
        fs::write(root.join("src").join("lib.rs"), "pub fn foo() {}").unwrap();
        fs::write(root.join("src").join("main.py"), "print('hello')").unwrap();
        let guard = PathGuard::new(vec![root], vec![]);
        (dir, guard)
    }

    #[tokio::test]
    async fn test_search_files_basic() {
        let (_dir, guard) = setup();
        let cmd = SearchFiles {
            query: "main".into(),
            scope: None,
            file_types: None,
            limit: 20,
        };
        let result = cmd.execute(&guard).await.unwrap();
        assert!(result.success);
        let results = result.data["results"].as_array().unwrap();
        assert!(results.len() >= 2); // main.rs, main.py
    }

    #[tokio::test]
    async fn test_search_files_with_limit() {
        let (_dir, guard) = setup();
        let cmd = SearchFiles {
            query: ".".into(),
            scope: None,
            file_types: None,
            limit: 2,
        };
        let result = cmd.execute(&guard).await.unwrap();
        let results = result.data["results"].as_array().unwrap();
        assert!(results.len() <= 2);
    }

    #[tokio::test]
    async fn test_search_files_filtered() {
        let (_dir, guard) = setup();
        let cmd = SearchFiles {
            query: "main".into(),
            scope: None,
            file_types: Some(vec![".rs".into()]),
            limit: 20,
        };
        let result = cmd.execute(&guard).await.unwrap();
        let results = result.data["results"].as_array().unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0]["path"].as_str().unwrap().ends_with("main.rs"));
    }

    #[test]
    fn test_compute_score() {
        assert!((compute_score("main.rs", "main") - 0.8).abs() < 0.01);
        assert!((compute_score("my_main.rs", "main") - 0.5).abs() < 0.01);
        assert!((compute_score("main.rs", "main.rs") - 1.0).abs() < 0.01);
        assert!((compute_score("other.txt", "main") - 0.0).abs() < 0.01);
    }

    #[test]
    fn test_from_args() {
        let args = json!({
            "query": "test",
            "limit": 50,
            "fileTypes": [".rs"]
        });
        let cmd = SearchFiles::from_args(args).unwrap();
        assert_eq!(cmd.query, "test");
        assert_eq!(cmd.limit, 50);
        assert_eq!(cmd.file_types, Some(vec![".rs".into()]));
    }

    #[test]
    fn test_from_args_default_limit() {
        let cmd = SearchFiles::from_args(json!({ "query": "test" })).unwrap();
        assert_eq!(cmd.limit, 20);
    }

    #[test]
    fn test_from_args_max_limit() {
        let cmd = SearchFiles::from_args(json!({ "query": "test", "limit": 999 })).unwrap();
        assert_eq!(cmd.limit, 100);
    }
}
