use async_trait::async_trait;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use super::{SearchStrategy, ScoredFile, IndexerError, compute_content_hash, normalized_extension};
use crate::commands::is_secret_filename;

/// FTS5-based search strategy using SQLite's full-text search.
/// Each workspace has its own index.db file with files + files_fts tables.
pub struct Fts5Strategy {
    pool: SqlitePool,
    workspace_root: PathBuf,
}

impl Fts5Strategy {
    /// Open or create an FTS5 index for the given workspace root.
    /// The index db is stored at {workspace_root}/.geonexus/index.db
    pub async fn new(workspace_root: &Path) -> Result<Self, IndexerError> {
        let index_dir = workspace_root.join(".geonexus");
        tokio::fs::create_dir_all(&index_dir).await?;

        let db_path = index_dir.join("index.db");
        let connect_opts = SqliteConnectOptions::new()
            .filename(&db_path)
            .create_if_missing(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(connect_opts)
            .await?;

        let strategy = Self {
            pool,
            workspace_root: workspace_root.to_path_buf(),
        };

        strategy.initialize_schema().await?;
        Ok(strategy)
    }

    async fn initialize_schema(&self) -> Result<(), IndexerError> {
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS files (
                path TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                extension TEXT,
                size_bytes INTEGER,
                modified_at INTEGER,
                content_hash TEXT,
                last_indexed_at INTEGER NOT NULL
            )"
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
                name, path, content_preview
            )"
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Index a single file (add or update).
    pub async fn index_file(&self, path: &Path) -> Result<(), IndexerError> {
        if !path.exists() || !path.is_file() {
            return Ok(());
        }

        let metadata = tokio::fs::metadata(path).await?;
        let content = tokio::fs::read(path).await?;
        let content_hash = compute_content_hash(&content);
        let name = path.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        let ext = normalized_extension(path);
        let modified_at = metadata.modified()
            .ok()
            .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64);
        let size_bytes = metadata.len() as i64;
        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        // Preview: first 200 chars of content
        let preview = if content.is_empty() {
            String::new()
        } else {
            let text = String::from_utf8_lossy(&content[..content.len().min(200)]);
            text.to_string()
        };

        let rel_path = path.strip_prefix(&self.workspace_root)
            .unwrap_or(path)
            .to_string_lossy()
            .to_string();

        sqlx::query(
            "INSERT OR REPLACE INTO files (path, name, extension, size_bytes, modified_at, content_hash, last_indexed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
        )
        .bind(&rel_path)
        .bind(&name)
        .bind(&ext)
        .bind(size_bytes)
        .bind(modified_at)
        .bind(&content_hash)
        .bind(now)
        .execute(&self.pool)
        .await?;

        // Update FTS index (standalone, not content-sync)
        // Delete existing entry first, then insert
        sqlx::query(
            "DELETE FROM files_fts WHERE path = ?1"
        )
        .bind(&rel_path)
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "INSERT INTO files_fts (name, path, content_preview) VALUES (?1, ?2, ?3)"
        )
        .bind(&name)
        .bind(&rel_path)
        .bind(&preview)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Remove a file from the index.
    pub async fn remove_file(&self, path: &Path) -> Result<(), IndexerError> {
        let rel_path = path.strip_prefix(&self.workspace_root)
            .unwrap_or(path)
            .to_string_lossy()
            .to_string();

        sqlx::query("DELETE FROM files WHERE path = ?1")
            .bind(&rel_path)
            .execute(&self.pool)
            .await?;

        sqlx::query("DELETE FROM files_fts WHERE path = ?1")
            .bind(&rel_path)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Full re-index of the workspace.
    pub async fn reindex_all(&self) -> Result<u64, IndexerError> {
        let mut count = 0u64;
        self.walk_and_index(&self.workspace_root, &mut count).await?;
        Ok(count)
    }

    async fn walk_and_index(&self, dir: &Path, count: &mut u64) -> Result<(), IndexerError> {
        let mut read_dir = tokio::fs::read_dir(dir).await?;
        while let Some(entry) = read_dir.next_entry().await? {
            let path = entry.path();
            if path.is_dir() {
                // Skip .geonexus directory
                if path.file_name().map(|n| n == ".geonexus").unwrap_or(false) {
                    continue;
                }
                Box::pin(self.walk_and_index(&path, count)).await?;
            } else if path.is_file() {
                // Skip secret files (.env, *secret*, *credentials*, id_rsa*)
                if path.file_name()
                    .map(|n| is_secret_filename(&n.to_string_lossy()))
                    .unwrap_or(false)
                {
                    continue;
                }
                self.index_file(&path).await?;
                *count += 1;
            }
        }
        Ok(())
    }

    /// Get total number of indexed files.
    pub async fn indexed_count(&self) -> Result<i64, IndexerError> {
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM files")
            .fetch_one(&self.pool)
            .await?;
        Ok(row.0)
    }

    /// Check if the index is empty.
    pub async fn is_empty(&self) -> Result<bool, IndexerError> {
        Ok(self.indexed_count().await? == 0)
    }

    pub fn workspace_root(&self) -> &Path {
        &self.workspace_root
    }
}

#[async_trait]
impl SearchStrategy for Fts5Strategy {
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<ScoredFile>, IndexerError> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }

        // Escape FTS5 special characters
        let sanitized = query.replace('"', "").replace("'", "");
        let fts_query = format!("\"{}\"", sanitized);

        let rows = sqlx::query_as::<_, (String, String, Option<String>, Option<i64>, Option<i64>, f64)>(
            "SELECT f.path, f.name, f.extension, f.modified_at, f.size_bytes, rank
             FROM files_fts f_ts
             JOIN files f ON f.path = f_ts.path
             WHERE files_fts MATCH ?1
             ORDER BY rank
             LIMIT ?2"
        )
        .bind(&fts_query)
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await?;

        // Fetch content_preview separately from FTS
        let results = rows.into_iter().map(|(path, _name, ext, modified_at, size_bytes, score)| {
            let full_path = self.workspace_root.join(&path);
            ScoredFile {
                path: full_path,
                score,
                snippet: None, // content_preview from FTS
                extension: ext,
                modified_at,
                size_bytes,
            }
        }).collect();

        Ok(results)
    }

    fn name(&self) -> &'static str {
        "fts5"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    async fn setup_index() -> (TempDir, Fts5Strategy) {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();

        // Create some test files
        fs::write(root.join("hello.txt"), "hello world this is a test file").unwrap();
        fs::write(root.join("goodbye.txt"), "goodbye world").unwrap();
        fs::create_dir_all(root.join("src")).unwrap();
        fs::write(root.join("src").join("main.rs"), "fn main() { println!(\"hello\"); }").unwrap();

        let strategy = Fts5Strategy::new(&root).await.unwrap();
        strategy.reindex_all().await.unwrap();

        (dir, strategy)
    }

    #[tokio::test]
    async fn test_index_file() {
        let (dir, strategy) = setup_index().await;
        let count = strategy.indexed_count().await.unwrap();
        assert_eq!(count, 3);
        let _ = dir;
    }

    #[tokio::test]
    async fn test_search_basic() {
        let (_dir, strategy) = setup_index().await;
        let results = strategy.search("hello", 10).await.unwrap();
        assert!(results.len() >= 2); // hello.txt and main.rs
    }

    #[tokio::test]
    async fn test_search_empty_query() {
        let (_dir, strategy) = setup_index().await;
        let results = strategy.search("", 10).await.unwrap();
        assert!(results.is_empty());
    }

    #[tokio::test]
    async fn test_search_no_results() {
        let (_dir, strategy) = setup_index().await;
        let results = strategy.search("zzzzzznonexistent", 10).await.unwrap();
        assert!(results.is_empty());
    }

    #[tokio::test]
    async fn test_search_limit() {
        let (_dir, strategy) = setup_index().await;
        // Add more files with "hello"
        let root = strategy.workspace_root().to_path_buf();
        fs::write(root.join("a.txt"), "hello a").unwrap();
        fs::write(root.join("b.txt"), "hello b").unwrap();
        fs::write(root.join("c.txt"), "hello c").unwrap();
        strategy.reindex_all().await.unwrap();

        let results = strategy.search("hello", 2).await.unwrap();
        assert!(results.len() <= 2);
    }

    #[tokio::test]
    async fn test_remove_file() {
        let (_dir, strategy) = setup_index().await;
        let root = strategy.workspace_root().to_path_buf();

        strategy.remove_file(&root.join("hello.txt")).await.unwrap();
        let count = strategy.indexed_count().await.unwrap();
        assert_eq!(count, 2);

        let results = strategy.search("hello", 10).await.unwrap();
        // main.rs still has "hello" in content
        assert!(!results.iter().any(|r| r.path.to_string_lossy().contains("hello.txt")));
    }

    #[tokio::test]
    async fn test_reindex_empty_index() {
        let dir = TempDir::new().unwrap();
        let strategy = Fts5Strategy::new(dir.path()).await.unwrap();
        assert!(strategy.is_empty().await.unwrap());
        let count = strategy.reindex_all().await.unwrap();
        assert_eq!(count, 0);
    }

    #[tokio::test]
    async fn test_secret_files_skipped_during_index() {
        let dir = TempDir::new().unwrap();
        let root = dir.path().to_path_buf();

        // Create normal files + secret files
        fs::write(root.join("main.rs"), "fn main() {}").unwrap();
        fs::write(root.join(".env"), "TOKEN=secret").unwrap();
        fs::write(root.join("credentials.json"), "{}").unwrap();
        fs::write(root.join("id_rsa"), "ssh-key").unwrap();
        fs::write(root.join("README.md"), "docs").unwrap();
        fs::write(root.join(".env.production"), "KEY=val").unwrap();

        let strategy = Fts5Strategy::new(&root).await.unwrap();
        let count = strategy.reindex_all().await.unwrap();

        // Only main.rs, README.md should be indexed (3 files)
        assert_eq!(count, 2);

        // Verify secret files are not in index
        let results = strategy.search("TOKEN", 10).await.unwrap();
        assert!(results.is_empty(), "secret files should not be searchable");

        let results = strategy.search("ssh", 10).await.unwrap();
        assert!(results.is_empty(), "id_rsa content should not be searchable");
    }
}
