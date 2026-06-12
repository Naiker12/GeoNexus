use serde::Serialize;
use tauri::{AppHandle, Emitter};

use geonexus_core::agents::registry::EventBus;

pub struct NotificationEmitter {
    app_handle: AppHandle,
}

impl NotificationEmitter {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    pub fn emit<T: Serialize + Clone>(&self, event: &str, payload: &T) {
        let _ = self.app_handle.emit(event, payload);
    }
}

impl EventBus for NotificationEmitter {
    fn emit(&self, event: &str, payload: &str) {
        let _ = self.app_handle.emit(event, payload);
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct AgentEventPayload {
    pub task_id: String,
    pub agent_type: String,
    pub description: String,
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SyncEventPayload {
    pub connector_id: String,
    pub connector_name: String,
    pub new_files: u32,
    pub updated_files: u32,
    pub errors: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct IndexEventPayload {
    pub asset_id: String,
    pub file_name: String,
    pub chunk_count: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct ResearchEventPayload {
    pub query: String,
    pub iteration: u8,
    pub sources_found: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct GraphUpdatedPayload {
    pub project_id: String,
    pub new_nodes: u32,
    pub new_edges: u32,
}
