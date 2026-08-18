pub mod fts_index;
pub mod embeddings;
pub mod hybrid_search;

use async_trait::async_trait;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct ScoredFile {
    pub path: PathBuf,
    pub score: f64,
    pub snippet: Option<String>,
    pub extension: Option<String>,
    pub modified_at: Option<i64>,
    pub size_bytes: Option<i64>,
}

#[derive(Debug, thiserror::Error)]
pub enum IndexerError {
    #[error("sqlite error: {0}")]
    Sqlite(String),
    #[error("io error: {0}")]
    Io(String),
    #[error("index not initialized for workspace: {0}")]
    NotInitialized(String),
    #[error("embedding model not available: {0}")]
    EmbeddingNotAvailable(String),
}

impl From<sqlx::Error> for IndexerError {
    fn from(e: sqlx::Error) -> Self {
        IndexerError::Sqlite(e.to_string())
    }
}

impl From<std::io::Error> for IndexerError {
    fn from(e: std::io::Error) -> Self {
        IndexerError::Io(e.to_string())
    }
}

#[async_trait]
pub trait SearchStrategy: Send + Sync {
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<ScoredFile>, IndexerError>;
    fn name(&self) -> &'static str;
}

/// Reciprocal Rank Fusion — combina múltiples listas de resultados ranked.
/// k is a constant (typically 60) to avoid high rank domination.
pub fn reciprocal_rank_fusion(lists: Vec<Vec<ScoredFile>>, k: f64, limit: usize) -> Vec<ScoredFile> {
    use std::collections::HashMap;

    let mut scores: HashMap<String, (f64, ScoredFile)> = HashMap::new();

    for list in lists {
        for (rank, item) in list.iter().enumerate() {
            let path_str = item.path.to_string_lossy().to_string();
            let rrf_score = 1.0 / (k + rank as f64 + 1.0);

            let entry = scores.entry(path_str.clone()).or_insert_with(|| {
                (0.0, ScoredFile {
                    path: item.path.clone(),
                    score: 0.0,
                    snippet: item.snippet.clone(),
                    extension: item.extension.clone(),
                    modified_at: item.modified_at,
                    size_bytes: item.size_bytes,
                })
            });

            entry.0 += rrf_score;
        }
    }

    let mut results: Vec<(f64, ScoredFile)> = scores.into_values().collect();
    results.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    results.truncate(limit);

    results.into_iter().map(|(score, mut item)| {
        item.score = score;
        item
    }).collect()
}

/// Apply metadata boost: boost files modified recently
pub fn apply_metadata_boost(mut results: Vec<ScoredFile>, boost_factor: f64) -> Vec<ScoredFile> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    for item in &mut results {
        if let Some(modified_at) = item.modified_at {
            let age_seconds = now - modified_at;
            let age_hours = age_seconds as f64 / 3600.0;
            if age_hours < 24.0 {
                // Boost files modified in last 24h
                let boost = boost_factor * (1.0 - age_hours / 24.0);
                item.score += boost;
            }
        }
    }

    // Re-sort after boost
    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    results
}

/// Compute content hash using SHA2-256
pub fn compute_content_hash(content: &[u8]) -> String {
    use sha2::Digest;
    let mut hasher = sha2::Sha256::new();
    hasher.update(content);
    format!("{:x}", hasher.finalize())
}

pub fn normalized_extension(path: &std::path::Path) -> Option<String> {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e.to_lowercase()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_rrf_basic() {
        let list1 = vec![
            ScoredFile { path: PathBuf::from("/a.txt"), score: 0.0, snippet: None, extension: None, modified_at: None, size_bytes: None },
            ScoredFile { path: PathBuf::from("/b.txt"), score: 0.0, snippet: None, extension: None, modified_at: None, size_bytes: None },
        ];
        let list2 = vec![
            ScoredFile { path: PathBuf::from("/b.txt"), score: 0.0, snippet: None, extension: None, modified_at: None, size_bytes: None },
            ScoredFile { path: PathBuf::from("/c.txt"), score: 0.0, snippet: None, extension: None, modified_at: None, size_bytes: None },
        ];

        let fused = reciprocal_rank_fusion(vec![list1, list2], 60.0, 10);
        assert_eq!(fused.len(), 3);
        // b.txt appears in both lists, so should rank highest
        assert!(fused[0].path.to_string_lossy().contains("b.txt"));
    }

    #[test]
    fn test_metadata_boost() {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        let results = vec![
            ScoredFile {
                path: PathBuf::from("/old.txt"), score: 0.5,
                snippet: None, extension: None,
                modified_at: Some(now - 86400 * 7), // 7 days ago
                size_bytes: None,
            },
            ScoredFile {
                path: PathBuf::from("/new.txt"), score: 0.5,
                snippet: None, extension: None,
                modified_at: Some(now - 3600), // 1 hour ago
                size_bytes: None,
            },
        ];

        let boosted = apply_metadata_boost(results, 0.3);
        assert_eq!(boosted.len(), 2);
        // new.txt should rank higher after boost
        assert!(boosted[0].path.to_string_lossy().contains("new.txt"));
    }

    #[test]
    fn test_compute_content_hash() {
        let hash1 = compute_content_hash(b"hello world");
        let hash2 = compute_content_hash(b"hello world");
        let hash3 = compute_content_hash(b"different");
        assert_eq!(hash1, hash2);
        assert_ne!(hash1, hash3);
        assert_eq!(hash1.len(), 64); // SHA2-256 hex
    }

    #[test]
    fn test_normalized_extension() {
        assert_eq!(normalized_extension(Path::new("file.rs")), Some(".rs".into()));
        assert_eq!(normalized_extension(Path::new("file.RS")), Some(".rs".into()));
        assert_eq!(normalized_extension(Path::new("Makefile")), None);
        assert_eq!(normalized_extension(Path::new("/path/to/file.tar.gz")), Some(".gz".into()));
    }
}
