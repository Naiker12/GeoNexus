use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AssetStatus {
    Pending,
    Indexing,
    Ready,
    Conflict,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CacheState {
    None,
    Partial,
    Cached,
    Stale,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AssetKind {
    Document,
    Layer,
    Shapefile,
    Csv,
    Raster,
    Word,
    Excel,
    Output,
    Other,
}

/// Asset en el inventario de Datos.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataAsset {
    pub id: String,
    pub project_id: String,
    pub workspace_id: Option<String>,
    pub name: String,
    pub kind: AssetKind,
    pub source: String,
    pub location: String,
    pub agent_id: Option<String>,
    pub connector_id: Option<String>,
    pub status: AssetStatus,
    pub size_bytes: Option<i64>,
    pub chunks: i64,
    pub embeddings: i64,
    pub graph_nodes: i64,
    pub cache_state: CacheState,
    pub trace_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Métricas agregadas del proyecto — una sola query, sin N+1.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataStoreMetrics {
    pub project_id: String,
    pub total_assets: i64,
    pub assets_ready: i64,
    pub assets_pending: i64,
    pub assets_error: i64,
    pub total_chunks: i64,
    pub total_embeddings: i64,
    pub total_graph_nodes: i64,
    pub cache_size_bytes: i64,
}

/// Resultado de validar si un asset está listo para la IA.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetValidation {
    pub asset_id: String,
    pub file_exists: bool,
    pub path_allowed: bool,
    pub metadata_ok: bool,
    pub cache_valid: bool,
    pub chunks_exist: bool,
    pub is_ready: bool,
    pub issues: Vec<String>,
}

impl AssetValidation {
    /// Construye la validación con todos los checks y calcula `is_ready`.
    pub fn new(
        asset_id: String,
        file_exists: bool,
        path_allowed: bool,
        metadata_ok: bool,
        cache_valid: bool,
        chunks_exist: bool,
        issues: Vec<String>,
    ) -> Self {
        let is_ready = file_exists && path_allowed && metadata_ok && cache_valid && chunks_exist;
        Self {
            asset_id,
            file_exists,
            path_allowed,
            metadata_ok,
            cache_valid,
            chunks_exist,
            is_ready,
            issues,
        }
    }
}
