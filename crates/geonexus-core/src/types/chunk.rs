use serde::{Deserialize, Serialize};

/// Fragmento de texto extraído de un documento para búsqueda vectorial.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentChunk {
    pub id: String,
    pub asset_id: String,
    pub chunk_index: i64,
    pub content: String,
    pub token_count: i64,
    pub page_number: Option<i64>,
    pub created_at: i64,
}
