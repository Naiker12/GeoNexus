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

// ── Automation Commands ────────────────────────────────────────

#[tauri::command]
pub async fn create_automation(
    state: State<'_, AppState>,
    project_id: String,
    name: String,
    description: Option<String>,
    intent: String,
    action_type: String,
    action_config: Option<serde_json::Value>,
    channel: String,
    cron_expression: Option<String>,
) -> Result<geonexus_db::automation_repo::Automation, String> {
    geonexus_db::automation_repo::create_automation(
        &state.db,
        &project_id,
        &name,
        description.as_deref(),
        &intent,
        &action_type,
        action_config.as_ref(),
        &channel,
        cron_expression.as_deref(),
    ).await
}

#[tauri::command]
pub async fn list_automations(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<geonexus_db::automation_repo::Automation>, String> {
    geonexus_db::automation_repo::list_automations(&state.db, &project_id).await
}

#[tauri::command]
pub async fn toggle_automation(
    state: State<'_, AppState>,
    automation_id: String,
    enabled: bool,
) -> Result<geonexus_db::automation_repo::Automation, String> {
    geonexus_db::automation_repo::toggle_automation(&state.db, &automation_id, enabled).await
}

#[tauri::command]
pub async fn update_automation(
    state: State<'_, AppState>,
    id: String,
    name: String,
    description: Option<String>,
    intent: String,
    action_type: String,
    action_config: Option<serde_json::Value>,
    channel: String,
    cron_expression: Option<String>,
    enabled: bool,
) -> Result<geonexus_db::automation_repo::Automation, String> {
    geonexus_db::automation_repo::update_automation(
        &state.db,
        &id,
        &name,
        description.as_deref(),
        &intent,
        &action_type,
        action_config.as_ref(),
        &channel,
        cron_expression.as_deref(),
        enabled,
    ).await
}

#[tauri::command]
pub async fn delete_automation(
    state: State<'_, AppState>,
    automation_id: String,
) -> Result<(), String> {
    geonexus_db::automation_repo::delete_automation(&state.db, &automation_id).await
}

// ── Patch Proposals ────────────────────────────────────────────

#[tauri::command]
pub async fn list_patches(
    state: State<'_, AppState>,
    project_id: String,
    status: Option<String>,
) -> Result<Vec<geonexus_db::patch_repo::PatchProposal>, String> {
    geonexus_db::patch_repo::list_patches(&state.db, &project_id, status.as_deref()).await
}

#[tauri::command]
pub async fn update_patch_status(
    state: State<'_, AppState>,
    id: String,
    status: String,
) -> Result<geonexus_db::patch_repo::PatchProposal, String> {
    geonexus_db::patch_repo::update_patch_status(&state.db, &id, &status).await
}

#[tauri::command]
pub async fn delete_patch(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    geonexus_db::patch_repo::delete_patch(&state.db, &id).await
}

// ── Trajectory Export ──────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct TrajectoryExport {
    pub conversation_id: String,
    pub title: Option<String>,
    pub messages: Vec<TrajectoryMessage>,
    pub tool_calls: Vec<TrajectoryToolCall>,
    pub exported_at: i64,
}

/// ShareGPT-compatible format for fine-tuning/RL.
#[derive(Debug, Serialize)]
pub struct ShareGptExport {
    pub conversations: Vec<ShareGptConversation>,
    pub exported_at: i64,
    pub format: String,
}

#[derive(Debug, Serialize)]
pub struct ShareGptConversation {
    pub id: String,
    pub messages: Vec<ShareGptMessage>,
}

#[derive(Debug, Serialize)]
pub struct ShareGptMessage {
    pub from: String,
    pub value: String,
}

#[derive(Debug, Serialize)]
pub struct TrajectoryMessage {
    pub role: String,
    pub content: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize)]
pub struct TrajectoryToolCall {
    pub tool_name: String,
    pub args: serde_json::Value,
    pub result_summary: String,
    pub conversation_id: String,
    pub created_at: i64,
}

#[tauri::command]
pub async fn export_conversation_trajectory(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<TrajectoryExport, String> {
    if conversation_id.trim().is_empty() {
        return Err("conversation_id requerido".into());
    }

    let messages = chat_repo::list_messages(&state.db, &conversation_id).await?;

    let title: Option<String> = sqlx::query_scalar(
        "SELECT title FROM conversations WHERE id = ?"
    )
    .bind(&conversation_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| format!("Error consultando titulo: {e}"))?
    .flatten();

    let trajectory_messages: Vec<TrajectoryMessage> = messages
        .iter()
        .map(|m| {
            let role_str = serde_json::to_string(&m.role)
                .unwrap_or_default()
                .trim_matches('"')
                .to_string();
            TrajectoryMessage {
                role: role_str,
                content: m.content.clone(),
                created_at: m.created_at,
            }
        })
        .collect();

    let tool_calls: Vec<TrajectoryToolCall> = messages
        .iter()
        .flat_map(|m| {
            m.tool_calls.iter().filter_map(|tc| {
                let name = tc.get("function")
                    .and_then(|f| f.get("name"))
                    .and_then(|n| n.as_str())
                    .unwrap_or("unknown");
                let args = tc.get("function")
                    .and_then(|f| f.get("arguments"))
                    .cloned()
                    .unwrap_or(serde_json::Value::Null);
                Some(TrajectoryToolCall {
                    tool_name: name.to_string(),
                    args,
                    result_summary: String::new(),
                    conversation_id: conversation_id.clone(),
                    created_at: m.created_at,
                })
            })
        })
        .collect();

    Ok(TrajectoryExport {
        conversation_id: conversation_id.clone(),
        title,
        messages: trajectory_messages,
        tool_calls,
        exported_at: unix_now(),
    })
}

#[tauri::command]
pub async fn export_conversations_sharegpt(
    state: State<'_, AppState>,
    project_id: String,
    limit: Option<i64>,
) -> Result<ShareGptExport, String> {
    let conversations = chat_repo::list_conversations(&state.db, &project_id).await?;
    let limit = limit.unwrap_or(10).min(50) as usize;

    let mut sharegpt_convs = Vec::new();
    for conv in conversations.iter().take(limit) {
        let messages = chat_repo::list_messages(&state.db, &conv.id).await?;
        let sharegpt_msgs: Vec<ShareGptMessage> = messages.iter().map(|m| {
            let from = match m.role {
                geonexus_core::chat::MessageRole::User => "human",
                _ => "gpt",
            };
            ShareGptMessage {
                from: from.to_string(),
                value: m.content.clone(),
            }
        }).collect();

        sharegpt_convs.push(ShareGptConversation {
            id: conv.id.clone(),
            messages: sharegpt_msgs,
        });
    }

    Ok(ShareGptExport {
        conversations: sharegpt_convs,
        exported_at: unix_now(),
        format: "sharegpt".into(),
    })
}

// ── User Profile Commands ──────────────────────────────────────

#[tauri::command]
pub async fn upsert_profile_entry(
    state: State<'_, AppState>,
    key: String,
    value: String,
    category: String,
    confidence: f64,
    source: String,
) -> Result<geonexus_db::user_profile_repo::UserProfileEntry, String> {
    geonexus_db::user_profile_repo::upsert_profile_entry(
        &state.db, &key, &value, &category, confidence, &source,
    ).await
}

#[tauri::command]
pub async fn get_profile_by_key(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<geonexus_db::user_profile_repo::UserProfileEntry>, String> {
    geonexus_db::user_profile_repo::get_profile_by_key(&state.db, &key).await
}

#[tauri::command]
pub async fn list_profile_entries(
    state: State<'_, AppState>,
    category: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<geonexus_db::user_profile_repo::UserProfileEntry>, String> {
    geonexus_db::user_profile_repo::list_profile_entries(&state.db, category.as_deref(), limit.unwrap_or(50)).await
}

#[tauri::command]
pub async fn delete_profile_entry(
    state: State<'_, AppState>,
    entry_id: String,
) -> Result<(), String> {
    geonexus_db::user_profile_repo::delete_profile_entry(&state.db, &entry_id).await
}

#[tauri::command]
pub async fn clear_user_profile(
    state: State<'_, AppState>,
) -> Result<(), String> {
    geonexus_db::user_profile_repo::clear_all_profile_entries(&state.db).await
}

// ── Curated Memory Commands ────────────────────────────────────

#[tauri::command]
pub async fn add_curated_fact(
    state: State<'_, AppState>,
    fact: String,
    category: String,
    source: String,
    confidence: f64,
    tags: Vec<String>,
) -> Result<geonexus_db::memory_repo::CuratedFact, String> {
    geonexus_db::memory_repo::add_fact(&state.db, &fact, &category, &source, confidence, &tags).await
}

#[tauri::command]
pub async fn list_curated_facts(
    state: State<'_, AppState>,
    category: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<geonexus_db::memory_repo::CuratedFact>, String> {
    geonexus_db::memory_repo::list_facts(&state.db, category.as_deref(), limit.unwrap_or(50)).await
}

#[tauri::command]
pub async fn search_curated_facts(
    state: State<'_, AppState>,
    query: String,
    category: Option<String>,
    min_confidence: Option<f64>,
) -> Result<Vec<geonexus_db::memory_repo::CuratedFact>, String> {
    geonexus_db::memory_repo::search_facts(
        &state.db, &query, category.as_deref(),
        min_confidence.unwrap_or(0.0), 20,
    ).await
}

#[tauri::command]
pub async fn update_curated_fact(
    state: State<'_, AppState>,
    fact_id: String,
    fact: Option<String>,
    category: Option<String>,
    confidence: Option<f64>,
    tags: Option<Vec<String>>,
) -> Result<geonexus_db::memory_repo::CuratedFact, String> {
    geonexus_db::memory_repo::update_fact(
        &state.db, &fact_id, fact.as_deref(),
        category.as_deref(), confidence, tags.as_deref(),
    ).await
}

#[tauri::command]
pub async fn delete_curated_fact(
    state: State<'_, AppState>,
    fact_id: String,
) -> Result<(), String> {
    geonexus_db::memory_repo::delete_fact(&state.db, &fact_id).await
}

#[tauri::command]
pub async fn search_messages_fts(
    project_id: String,
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<geonexus_core::chat::MessageSearchResult>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    chat_repo::search_messages_fts(&state.db, &query, &project_id, 20).await
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
