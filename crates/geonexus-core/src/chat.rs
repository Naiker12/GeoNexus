use serde::{Deserialize, Serialize};

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
    pub created_at: i64,
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
    pub use_context: bool,
    pub max_context_chunks: Option<usize>,
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

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_input() -> SendMessageInput {
        SendMessageInput {
            project_id: "p1".into(),
            workspace_id: None,
            conversation_id: None,
            content: "Hola".into(),
            provider: "ollama".into(),
            model: "llama3.1".into(),
            endpoint: "http://localhost:11434".into(),
            use_context: false,
            max_context_chunks: None,
        }
    }

    #[test]
    fn role_serializes_snake_case() {
        assert_eq!(
            serde_json::to_string(&MessageRole::Assistant).unwrap(),
            r#""assistant""#
        );
    }

    #[test]
    fn send_message_input_validates_required_fields() {
        assert!(valid_input().validate().is_ok());
        assert!(matches!(
            SendMessageInput {
                project_id: "".into(),
                ..valid_input()
            }
            .validate(),
            Err(_)
        ));
    }
}
