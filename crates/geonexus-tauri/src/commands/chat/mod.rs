use std::time::{SystemTime, UNIX_EPOCH};

use geonexus_core::chat::{Conversation, Message};
use geonexus_db::chat_repo;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::llm::run_sidecar;
use crate::AppState;

pub mod send_message;
pub mod context;
pub mod tools;

pub use send_message::send_message;

#[derive(Debug, Deserialize)]
struct SidecarChatResult {
    status: String,
    #[serde(default)]
    text: Option<String>,
    #[serde(default, alias = "message")]
    msg: Option<serde_json::Value>,
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
    pub label: String,
    pub kind: String,
}

fn run_sidecar_json<T: serde::de::DeserializeOwned>(args: &[&str]) -> Result<T, String> {
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
        "SELECT label, kind FROM graph_nodes
         WHERE project_id = ?
         LIMIT 8"
    )
    .bind(&project_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| format!("Error consultando nodos del grafo: {e}"))?;

    Ok(ProjectContext { assets, graph_nodes })
}
