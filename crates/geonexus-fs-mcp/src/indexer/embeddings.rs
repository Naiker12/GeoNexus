use async_trait::async_trait;
use std::path::PathBuf;

use super::{SearchStrategy, ScoredFile, IndexerError};

/// Embedding-based search strategy.
/// 
/// Fase actual: stub que devuelve resultados vacíos.
/// En F3 completa, llama a un sidecar Python (o Rust nativo con candle/ort)
/// para generar embeddings y buscar por similitud coseno.
///
/// Pendiente para implementación futura:
/// - Llamada a sidecar Python con modelo all-MiniLM-L6-v2
/// - Almacenamiento de embeddings en file_embeddings table
/// - Búsqueda por similitud coseno con indexación ANN (faiss/usearch)
pub struct EmbeddingStrategy {
    model_version: String,
    _workspace_root: PathBuf,
}

impl EmbeddingStrategy {
    pub fn new(workspace_root: &PathBuf, model_version: &str) -> Self {
        Self {
            model_version: model_version.to_string(),
            _workspace_root: workspace_root.clone(),
        }
    }

    pub fn model_version(&self) -> &str {
        &self.model_version
    }

    /// Check if the embedding model is available.
    pub fn is_available(&self) -> bool {
        false // Not yet implemented
    }
}

#[async_trait]
impl SearchStrategy for EmbeddingStrategy {
    async fn search(&self, _query: &str, _limit: usize) -> Result<Vec<ScoredFile>, IndexerError> {
        // Stub: return empty results until embedding model is integrated
        Ok(Vec::new())
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
