use serde::{Deserialize, Serialize};

fn default_origin_kind() -> String {
    "document".to_string()
}

/// Nodo en el grafo de conocimiento.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub project_id: String,
    pub workspace_id: Option<String>,
    pub name: String,
    pub kind: String, // "norma" | "documento" | "capa" | "zona" | "concepto" | "chat_turn" | "web_search" | "upload" | "connector" | "rag_recall"
    pub description: String,
    pub evidence: String,
    pub x: f64,
    pub y: f64,
    pub weight: i64,
    pub created_at: i64,
    #[serde(default)]
    pub source_event: String,
    #[serde(default)]
    pub event_id: String,
    #[serde(default)]
    pub icon: String,
    #[serde(default)]
    pub is_ephemeral: bool,
    #[serde(default)]
    pub source_asset_id: Option<String>,
    #[serde(default)]
    pub source_chat_id: Option<String>,
    #[serde(default = "default_origin_kind")]
    pub origin_kind: String,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub deleted_at: Option<String>,
}

/// Relación/Arista en el grafo de conocimiento.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub id: String,
    pub project_id: String,
    pub source: String,
    pub target: String,
    pub relation: String,
    pub strength: i64,
    pub created_at: i64,
}

/// Payload para el evento graph:updated que se emite via Tauri
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphUpdatePayload {
    pub source_event: String,   // Evento origen: "chat", "upload", "sync" o "rag"
    pub event_id: String,       // ID del evento correspondiente (conversation_id, sync_event_id, etc.)
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub timestamp: i64,
}
