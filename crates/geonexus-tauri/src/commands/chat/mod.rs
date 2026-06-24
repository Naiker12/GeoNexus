use std::time::{SystemTime, UNIX_EPOCH};

use geonexus_core::chat::{Conversation, ConversationSearchResult, Message};
use geonexus_db::chat_repo;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::llm::run_sidecar;
use crate::AppState;

pub mod classifier;
pub mod context;
pub mod messages;
pub mod search;
pub mod send_message;
pub mod stats;
pub mod tools;
pub mod validator;

pub use send_message::send_message;

#[derive(Debug, Deserialize)]
pub struct SidecarChatResult {
    status: String,
    #[serde(default)]
    text: Option<String>,
    #[serde(default, alias = "message")]
    msg: Option<serde_json::Value>,
    #[serde(default)]
    usage: Option<serde_json::Value>,
    #[serde(default)]
    pub model: Option<String>,
}

impl SidecarChatResult {
    fn content(&self) -> Option<String> {
        if let Some(val) = &self.msg {
            if let Some(obj) = val.as_object() {
                if let Some(c) = obj.get("content").and_then(|c| c.as_str()) {
                    if !c.is_empty() {
                        return Some(c.trim().to_string());
                    }
                }
            }
        }
        self.text.as_ref().map(|s| s.trim().to_string())
    }

    fn reasoning_content(&self) -> Option<String> {
        if let Some(val) = &self.msg {
            if let Some(obj) = val.as_object() {
                if let Some(c) = obj.get("reasoning_content").and_then(|c| c.as_str()) {
                    if !c.is_empty() {
                        return Some(c.trim().to_string());
                    }
                }
            }
        }
        None
    }

    fn tool_calls(&self) -> Option<Vec<serde_json::Value>> {
        match &self.msg {
            Some(serde_json::Value::Object(obj)) => match obj.get("tool_calls") {
                Some(serde_json::Value::Array(arr)) if !arr.is_empty() => Some(arr.clone()),
                _ => None,
            },
            _ => None,
        }
    }

    fn error_message(&self) -> Option<String> {
        if self.status == "ok" {
            return None;
        }
        match &self.msg {
            Some(serde_json::Value::String(s)) => Some(s.clone()),
            _ => None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecallChunk {
    pub text: String,
    pub source: String,
    pub asset_id: String,
    #[serde(default)]
    pub chunk_index: usize,
    #[serde(default)]
    pub chunk_id: String,
    pub score: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecallInput {
    pub project_id: String,
    pub query: String,
    pub top_k: Option<usize>,
    pub collection: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ProjectContext {
    pub assets: Vec<ContextAsset>,
    pub graph_nodes: Vec<ContextNode>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ContextAsset {
    pub name: String,
    pub kind: String,
    pub status: String,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct ContextNode {
    pub id: String,
    pub label: String,
    pub kind: String,
}

pub fn run_sidecar_json<T: serde::de::DeserializeOwned>(args: &[&str]) -> Result<T, String> {
    let output = run_sidecar(args)?;
    serde_json::from_str(&output)
        .map_err(|e| format!("Error deserializando respuesta del sidecar: {e}. Output: {output}"))
}

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn title_from_message(content: &str) -> String {
    let trimmed = content.trim();
    let mut title: String = trimmed.chars().take(48).collect();
    if trimmed.chars().count() > 48 {
        title.push_str("...");
    }
    if title.is_empty() {
        "Nueva conversacion".into()
    } else {
        title
    }
}

#[tauri::command]
pub async fn delete_conversation(
    conversation_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if conversation_id.trim().is_empty() {
        return Err("conversation_id requerido".into());
    }
    chat_repo::delete_conversation(&state.db, &conversation_id).await
}

#[tauri::command]
pub async fn list_conversations(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Conversation>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    chat_repo::list_conversations(&state.db, &project_id).await
}

#[tauri::command]
pub async fn archive_conversation(
    conversation_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if conversation_id.trim().is_empty() {
        return Err("conversation_id requerido".into());
    }
    chat_repo::archive_conversation(&state.db, &conversation_id).await
}

#[tauri::command]
pub async fn unarchive_conversation(
    conversation_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if conversation_id.trim().is_empty() {
        return Err("conversation_id requerido".into());
    }
    chat_repo::unarchive_conversation(&state.db, &conversation_id).await
}

#[tauri::command]
pub async fn list_archived_conversations(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Conversation>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    chat_repo::list_archived_conversations(&state.db, &project_id).await
}

#[tauri::command]
pub async fn search_conversations(
    project_id: String,
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<ConversationSearchResult>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    let sanitized = query.trim().replace(|c: char| c.is_ascii_punctuation() && c != '\'', " ");
    chat_repo::search_conversations(&state.db, &project_id, &sanitized, 20).await
}

#[tauri::command]
pub async fn list_messages(
    conversation_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Message>, String> {
    if conversation_id.trim().is_empty() {
        return Err("conversation_id requerido".into());
    }
    chat_repo::list_messages(&state.db, &conversation_id).await
}

#[tauri::command]
pub async fn recall_chunks(
    input: RecallInput,
) -> Result<Vec<RecallChunk>, String> {
    if input.project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    if input.query.trim().is_empty() {
        return Err("query requerido".into());
    }

    let top_k = input.top_k.unwrap_or(4);
    let collection = input
        .collection
        .unwrap_or_else(|| "project_memory".into());

    run_sidecar_json(&[
        "--action",
        "recall_chunks",
        "--query",
        &input.query,
        "--project_id",
        &input.project_id,
        "--top_k",
        &top_k.to_string(),
        "--collection",
        &collection,
    ])
}

#[tauri::command]
pub async fn get_project_context(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<ProjectContext, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }

    let assets: Vec<ContextAsset> = sqlx::query_as::<_, ContextAsset>(
        "SELECT name, kind, status FROM assets
         WHERE workspace_id IN (SELECT id FROM workspaces WHERE project_id = ?)
         AND status = 'indexed'
         LIMIT 10"
    )
    .bind(&project_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| format!("Error consultando assets indexados: {e}"))?;

    let graph_nodes: Vec<ContextNode> = sqlx::query_as::<_, ContextNode>(
        "SELECT id, name AS label, kind FROM graph_nodes
         WHERE project_id = ?
         LIMIT 8"
    )
    .bind(&project_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| format!("Error consultando nodos del grafo: {e}"))?;

    Ok(ProjectContext { assets, graph_nodes })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    pub working_directory: String,
    pub code_execution_mode: String,
    pub persistent_shell: bool,
    pub env_passthrough: Vec<String>,
    pub file_read_limit: u64,
}

impl Default for WorkspaceConfig {
    fn default() -> Self {
        Self {
            working_directory: ".".into(),
            code_execution_mode: "project".into(),
            persistent_shell: true,
            env_passthrough: vec![],
            file_read_limit: 100_000,
        }
    }
}

#[tauri::command]
pub async fn save_workspace_config(
    state: State<'_, AppState>,
    config: WorkspaceConfig,
) -> Result<(), String> {
    let json = serde_json::to_string(&config).map_err(|e| e.to_string())?;
    sqlx::query(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('workspace_config', ?)"
    )
    .bind(&json)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_workspace_config(
    state: State<'_, AppState>,
) -> Result<WorkspaceConfig, String> {
    let row: Option<String> = sqlx::query_scalar(
        "SELECT value FROM settings WHERE key = 'workspace_config'"
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    match row {
        Some(val) => serde_json::from_str(&val).map_err(|e| e.to_string()),
        None => Ok(WorkspaceConfig::default()),
    }
}
