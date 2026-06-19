use async_trait::async_trait;
#[allow(unused_imports)]
use std::path::PathBuf;

use super::{SearchStrategy, ScoredFile, IndexerError, reciprocal_rank_fusion, apply_metadata_boost};

/// Hybrid search strategy combining BM25 (FTS5) and semantic (embeddings) search
/// with Reciprocal Rank Fusion and metadata boosting.
pub struct HybridSearchStrategy {
    bm25: Box<dyn SearchStrategy>,
    semantic: Box<dyn SearchStrategy>,
    bm25_weight: f64,
    semantic_weight: f64,
    rrf_k: f64,
    metadata_boost_factor: f64,
}

impl HybridSearchStrategy {
    pub fn new(
        bm25: Box<dyn SearchStrategy>,
        semantic: Box<dyn SearchStrategy>,
    ) -> Self {
        Self {
            bm25,
            semantic,
            bm25_weight: 0.4,
            semantic_weight: 0.6,
            rrf_k: 60.0,
            metadata_boost_factor: 0.3,
        }
    }

    pub fn with_weights(mut self, bm25_weight: f64, semantic_weight: f64) -> Self {
        self.bm25_weight = bm25_weight;
        self.semantic_weight = semantic_weight;
        self
    }

    pub fn with_rrf_k(mut self, k: f64) -> Self {
        self.rrf_k = k;
        self
    }

    pub fn with_metadata_boost(mut self, factor: f64) -> Self {
        self.metadata_boost_factor = factor;
        self
    }
}

#[async_trait]
impl SearchStrategy for HybridSearchStrategy {
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<ScoredFile>, IndexerError> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }

        // Fetch results from both strategies in parallel
        let (bm25_results, semantic_results) = tokio::join!(
            self.bm25.search(query, limit * 2),
            self.semantic.search(query, limit * 2),
        );

        let bm25_results = bm25_results.unwrap_or_default();
        let semantic_results = semantic_results.unwrap_or_default();

        // Apply weights to scores before fusion
        let weighted_bm25: Vec<ScoredFile> = bm25_results.into_iter()
            .map(|mut f| { f.score *= self.bm25_weight; f })
            .collect();

        let weighted_semantic: Vec<ScoredFile> = semantic_results.into_iter()
            .map(|mut f| { f.score *= self.semantic_weight; f })
            .collect();

        // Reciprocal Rank Fusion
        let fused = reciprocal_rank_fusion(
            vec![weighted_bm25, weighted_semantic],
            self.rrf_k,
            limit * 2,
        );

        // Apply metadata boost (recency boost)
        let boosted = apply_metadata_boost(fused, self.metadata_boost_factor);

        // Truncate to limit
        let mut results = boosted;
        results.truncate(limit);

        Ok(results)
    }

    fn name(&self) -> &'static str {
        "hybrid"
    }
}

pub fn hybrid_search(
    bm25: Box<dyn SearchStrategy>,
    semantic: Box<dyn SearchStrategy>,
) -> HybridSearchStrategy {
    HybridSearchStrategy::new(bm25, semantic)
}

#[cfg(test)]
mod tests {
    use super::*;
    use async_trait::async_trait;

    /// Mock strategy that returns predefined results
    struct MockStrategy {
        name: &'static str,
        results: Vec<ScoredFile>,
    }

    #[async_trait]
    impl SearchStrategy for MockStrategy {
        async fn search(&self, _query: &str, _limit: usize) -> Result<Vec<ScoredFile>, IndexerError> {
            Ok(self.results.clone())
        }

        fn name(&self) -> &'static str {
            self.name
        }
    }

    fn make_file(name: &str) -> ScoredFile {
        ScoredFile {
            path: PathBuf::from(format!("/workspace/{}", name)),
            score: 0.0,
            snippet: None,
            extension: name.rsplit('.').next().map(|e| format!(".{}", e)),
            modified_at: None,
            size_bytes: None,
        }
    }

    #[tokio::test]
    async fn test_hybrid_search_basic() {
        let bm25 = Box::new(MockStrategy {
            name: "bm25",
            results: vec![make_file("a.txt"), make_file("b.txt")],
        });

        let semantic = Box::new(MockStrategy {
            name: "semantic",
            results: vec![make_file("b.txt"), make_file("c.txt")],
        });

        let hybrid = HybridSearchStrategy::new(bm25, semantic);
        let results = hybrid.search("test", 10).await.unwrap();
        // b.txt appears in both, so should be first
        assert_eq!(results.len(), 3);
        assert!(results[0].path.to_string_lossy().contains("b.txt"));
    }

    #[tokio::test]
    async fn test_hybrid_search_empty_query() {
        let bm25 = Box::new(MockStrategy {
            name: "bm25",
            results: vec![],
        });
        let semantic = Box::new(MockStrategy {
            name: "semantic",
            results: vec![],
        });
        let hybrid = HybridSearchStrategy::new(bm25, semantic);
        let results = hybrid.search("", 10).await.unwrap();
        assert!(results.is_empty());
    }

    #[tokio::test]
    async fn test_hybrid_search_limit() {
        let bm25 = Box::new(MockStrategy {
            name: "bm25",
            results: vec![
                make_file("a.txt"), make_file("b.txt"),
                make_file("c.txt"), make_file("d.txt"),
            ],
        });
        let semantic = Box::new(MockStrategy {
            name: "semantic",
            results: vec![make_file("e.txt"), make_file("f.txt")],
        });

        let hybrid = HybridSearchStrategy::new(bm25, semantic);
        let results = hybrid.search("test", 3).await.unwrap();
        assert!(results.len() <= 3);
    }

    #[test]
    fn test_hybrid_builder() {
        let bm25 = Box::new(MockStrategy {
            name: "bm25",
            results: vec![],
        });
        let semantic = Box::new(MockStrategy {
            name: "semantic",
            results: vec![],
        });
        let hybrid = HybridSearchStrategy::new(bm25, semantic)
            .with_weights(0.5, 0.5)
            .with_rrf_k(30.0)
            .with_metadata_boost(0.5);
        assert_eq!(hybrid.bm25_weight, 0.5);
        assert_eq!(hybrid.semantic_weight, 0.5);
        assert_eq!(hybrid.rrf_k, 30.0);
        assert_eq!(hybrid.metadata_boost_factor, 0.5);
    }

    #[tokio::test]
    async fn test_hybrid_search_handles_bm25_error() {
        // When one strategy fails, the other should still work
        let semantic = Box::new(MockStrategy {
            name: "semantic",
            results: vec![make_file("a.txt")],
        });

        // Create a strategy that returns Err
        struct ErrStrategy;
        #[async_trait]
        impl SearchStrategy for ErrStrategy {
            async fn search(&self, _query: &str, _limit: usize) -> Result<Vec<ScoredFile>, IndexerError> {
                Err(IndexerError::Sqlite("simulated error".into()))
            }
            fn name(&self) -> &'static str { "err" }
        }

        let hybrid = HybridSearchStrategy::new(Box::new(ErrStrategy), semantic);
        let results = hybrid.search("test", 10).await.unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].path.to_string_lossy().contains("a.txt"));
    }
}
