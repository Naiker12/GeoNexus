use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncEventType {
    Discovered,
    Downloaded,
    Indexed,
    Embedded,
    GraphLinked,
    Conflict,
    Error,
    ConversationSaved,
}

/// Evento de pipeline para auditoría en la UI.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncEvent {
    pub id: String,
    pub project_id: String,
    pub workspace_id: Option<String>,
    pub connector_id: Option<String>,
    pub asset_id: Option<String>,
    pub agent_id: Option<String>,
    pub event_type: SyncEventType,
    pub detail: Option<String>,
    pub trace_id: Option<String>,
    pub created_at: i64,
}
