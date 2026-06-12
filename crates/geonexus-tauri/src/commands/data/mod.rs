pub mod queries;
pub mod assets;

pub use queries::*;
pub use assets::*;

#[derive(Debug, serde::Serialize)]
pub struct MentionableSource {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub sublabel: String,
    pub icon: String,
    pub color: String,
    pub status: String,
    pub last_synced: Option<i64>,
    pub asset_count: Option<i64>,
    pub provider: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct MentionableSources {
    pub connectors: Vec<MentionableSource>,
    pub assets: Vec<MentionableSource>,
    pub graph_nodes: Vec<MentionableSource>,
}
