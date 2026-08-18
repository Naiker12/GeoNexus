use async_trait::async_trait;
use serde::Deserialize;
use std::path::PathBuf;

use super::{SearchStrategy, ScoredFile, IndexerError};

#[derive(Deserialize)]
struct EmbedResult {
    #[allow(dead_code)]
    status: String,
    #[allow(dead_code)]
    path: Option<String>,
    #[allow(dead_code)]
    dim: Option<usize>,
    results: Option<Vec<EmbedSearchHit>>,
    available: Option<bool>,
}

#[derive(Deserialize)]
struct EmbedSearchHit {
    path: String,
    score: f64,
}

pub struct EmbeddingStrategy {
    model_version: String,
    workspace_root: PathBuf,
    sidecar_args: Vec<String>,
}

impl EmbeddingStrategy {
    pub fn new(workspace_root: &PathBuf, model_version: &str) -> Self {
        let python = Self::find_python();
        let script = Self::find_script();
        Self {
            model_version: model_version.to_string(),
            workspace_root: workspace_root.clone(),
            sidecar_args: vec![python, script],
        }
    }

    fn find_python() -> String {
        let candidates = [
            "ai/.venv/Scripts/python.exe",
            ".venv/Scripts/python.exe",
            "ai/.venv/bin/python",
            ".venv/bin/python",
        ];
        for c in &candidates {
            let p = PathBuf::from(c);
            if p.exists() {
                return p.to_string_lossy().to_string();
            }
        }
        "python".to_string()
    }

    fn find_script() -> String {
        let candidates = [
            "ai/fs_embed.py",
            "../ai/fs_embed.py",
        ];
        for c in &candidates {
            let p = PathBuf::from(c);
            if p.exists() {
                return p.to_string_lossy().to_string();
            }
        }
        "ai/fs_embed.py".to_string()
    }

    pub fn model_version(&self) -> &str {
        &self.model_version
    }

    fn run_sidecar(&self, args: &[&str]) -> Result<String, String> {
        let output = std::process::Command::new(&self.sidecar_args[0])
            .arg(&self.sidecar_args[1])
            .args(args)
            .current_dir(&self.workspace_root)
            .output()
            .map_err(|e| format!("Error ejecutando fs_embed.py: {e}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("fs_embed.py error: {stderr}"));
        }

        String::from_utf8(output.stdout)
            .map_err(|e| format!("Output no UTF-8: {e}"))
            .map(|s| s.trim().to_string())
    }

    pub fn is_available(&self) -> bool {
        self.run_sidecar(&["ping"])
            .ok()
            .and_then(|r| serde_json::from_str::<EmbedResult>(&r).ok())
            .map(|r| r.available.unwrap_or(false))
            .unwrap_or(false)
    }

    pub fn index_file(&self, file_path: &str, content: &str) -> Result<(), IndexerError> {
        self.run_sidecar(&["index", file_path, content])
            .map_err(|e| IndexerError::EmbeddingNotAvailable(e))?;
        Ok(())
    }
}

#[async_trait]
impl SearchStrategy for EmbeddingStrategy {
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<ScoredFile>, IndexerError> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }

        let output = self.run_sidecar(&["search", query, &limit.to_string()])
            .map_err(|e| IndexerError::EmbeddingNotAvailable(e))?;

        let parsed: EmbedResult = serde_json::from_str(&output)
            .map_err(|e| IndexerError::EmbeddingNotAvailable(format!("JSON error: {e}")))?;

        let results = parsed.results.unwrap_or_default();
        Ok(results.into_iter().map(|hit| {
            let p = PathBuf::from(&hit.path);
            let ext = p.extension().and_then(|e| e.to_str()).map(|e| format!(".{}", e.to_lowercase()));
            ScoredFile {
                path: if p.is_absolute() { p } else { self.workspace_root.join(&hit.path) },
                score: hit.score,
                snippet: None,
                extension: ext,
                modified_at: None,
                size_bytes: None,
            }
        }).collect())
    }

    fn name(&self) -> &'static str {
        "embeddings"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_embedding_stub_not_available() {
        let strategy = EmbeddingStrategy::new(&PathBuf::from("/tmp"), "v1");
        assert!(!strategy.is_available());
    }

    #[tokio::test]
    async fn test_embedding_stub_search_returns_empty() {
        let strategy = EmbeddingStrategy::new(&PathBuf::from("/tmp"), "v1");
        let results = strategy.search("test", 10).await.unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn test_model_version() {
        let strategy = EmbeddingStrategy::new(&PathBuf::from("/tmp"), "all-MiniLM-L6-v2");
        assert_eq!(strategy.model_version(), "all-MiniLM-L6-v2");
    }
}
