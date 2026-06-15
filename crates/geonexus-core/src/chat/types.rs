use serde::{Deserialize, Serialize};

/// Evento de razonamiento emitido en tiempo real desde send_message
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ReasoningStepEvent {
    IntentClassified {
        intent: String,
        confidence: f32,
        detected_entities: Vec<String>,
    },
    KnowledgeRetrieved {
        chunks_found: usize,
        assets_queried: Vec<String>,
        top_relevance: f32,
    },
    WebSearching {
        query: String,
        sources_found: usize,
    },
    SkillsInjected {
        skill_names: Vec<String>,
        total_tokens: usize,
    },
    McpToolCalled {
        server_id: String,
        tool_name: String,
        success: bool,
        duration_ms: u64,
    },
    GraphContextLoaded {
        nodes_count: usize,
        edges_count: usize,
    },
    GeneratingResponse {
        model: String,
        provider: String,
        estimated_tokens: Option<usize>,
    },
    ResponseComplete {
        total_duration_ms: u64,
        input_tokens: usize,
        output_tokens: usize,
        steps_executed: Vec<String>,
    },
}

/// Resumen de la sesión actual para mostrar "vida previa" del agente
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionSummary {
    pub message_count: usize,
    pub skills_in_session: Vec<String>,
    pub assets_in_session: Vec<String>,
    pub last_topics: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageRole {
    User,
    Assistant,
    Tool,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub project_id: String,
    pub workspace_id: Option<String>,
    pub title: Option<String>,
    pub provider: String,
    pub model: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub message_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchSource {
    pub url: String,
    pub title: String,
    pub snippet: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MessageStats {
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub total_tokens: u32,
    pub duration_ms: u64,
    pub tokens_per_second: f32,
    pub cost_usd: f64,
    pub context_window: u32,
    pub context_used_pct: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileAttachment {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub r#type: String,
    pub size: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<String>, // base64
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub preview_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: MessageRole,
    pub content: String,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub trace_id: String,
    pub chunks_used: Vec<String>,
    pub nodes_used: Vec<String>,
    pub tool_calls: Vec<serde_json::Value>,
    pub sources: Vec<String>,
    pub created_at: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub research_sources: Option<Vec<ResearchSource>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stats: Option<MessageStats>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub attachments: Vec<FileAttachment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMessageInput {
    pub project_id: String,
    pub workspace_id: Option<String>,
    pub conversation_id: Option<String>,
    pub content: String,
    pub provider: String,
    pub model: String,
    pub endpoint: String,
    pub api_key: Option<String>,
    pub use_context: bool,
    pub max_context_chunks: Option<usize>,
    #[serde(default)]
    pub web_search: bool,
    #[serde(default)]
    pub mentioned_asset_ids: Vec<String>,
    #[serde(default)]
    pub mentioned_connector_ids: Vec<String>,
    #[serde(default)]
    pub mentioned_node_ids: Vec<String>,
    #[serde(default)]
    pub mentioned_agent_sources: Vec<String>,
    #[serde(default)]
    pub skill_names: Vec<String>,
    #[serde(default)]
    pub attachments: Vec<FileAttachment>,
}

impl SendMessageInput {
    pub fn validate(&self) -> Result<(), String> {
        if self.project_id.trim().is_empty() {
            return Err("project_id requerido".into());
        }
        if self.content.trim().is_empty() {
            return Err("content requerido".into());
        }
        if self.provider.trim().is_empty() {
            return Err("provider requerido".into());
        }
        if self.model.trim().is_empty() {
            return Err("model requerido".into());
        }
        if self.endpoint.trim().is_empty() {
            return Err("endpoint requerido".into());
        }
        if self.content.len() > 32_000 {
            return Err("content excede limite de 32000 caracteres".into());
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMessageResponse {
    pub conversation_id: String,
    pub message: Message,
    pub chunks_used: Vec<ChunkReference>,
    pub trace_id: String,
    #[serde(default)]
    pub research_sources: Vec<ResearchSource>,
    #[serde(default)]
    pub search_query: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub validation_warnings: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub intent: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session_summary: Option<SessionSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkReference {
    pub chunk_id: String,
    pub asset_id: String,
    pub asset_name: String,
    pub chunk_index: usize,
    pub relevance_score: f32,
    pub text_preview: String,
}
