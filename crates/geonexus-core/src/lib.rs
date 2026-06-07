use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataAsset {
    pub id: String,
    pub name: String,
    pub kind: DataAssetKind,
    pub source: String,
    pub location: String,
    pub status: DataAssetStatus,
    pub updated: String,
    pub size: String,
    pub chunks: u32,
    pub embeddings: u32,
    pub graph_nodes: u32,
    pub cache_state: String,
    pub lineage: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataAssetKind {
    #[serde(rename = "PDF")]
    Pdf,
    #[serde(rename = "GIS")]
    Gis,
    #[serde(rename = "Excel")]
    Excel,
    #[serde(rename = "GeoJSON")]
    GeoJson,
    #[serde(rename = "Sync")]
    Sync,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataAssetStatus {
    #[serde(rename = "Indexado")]
    Indexed,
    #[serde(rename = "Sincronizando")]
    Syncing,
    #[serde(rename = "Pendiente")]
    Pending,
    #[serde(rename = "Conflicto")]
    Conflict,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataStoreMetric {
    pub name: String,
    pub role: String,
    pub value: String,
    pub detail: String,
    pub status: DataStoreStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DataStoreStatus {
    #[serde(rename = "Activo")]
    Active,
    #[serde(rename = "Simulado")]
    Simulated,
    #[serde(rename = "Planeado")]
    Planned,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncEvent {
    pub id: String,
    pub source: String,
    pub operation: String,
    pub status: SyncEventStatus,
    pub detail: String,
    pub time: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SyncEventStatus {
    #[serde(rename = "ok")]
    Ok,
    #[serde(rename = "queued")]
    Queued,
    #[serde(rename = "blocked")]
    Blocked,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataStoreSnapshot {
    pub assets: Vec<DataAsset>,
    pub stores: Vec<DataStoreMetric>,
    pub sync_events: Vec<SyncEvent>,
}
