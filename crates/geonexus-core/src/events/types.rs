use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum Domain {
    Chat,
    Agent,
    Graph,
    Mcp,
    Artifact,
    System,
    Connector,
    Sync,
}

impl Domain {
    pub fn as_str(&self) -> &'static str {
        match self {
            Domain::Chat => "chat",
            Domain::Agent => "agent",
            Domain::Graph => "graph",
            Domain::Mcp => "mcp",
            Domain::Artifact => "artifact",
            Domain::System => "system",
            Domain::Connector => "connector",
            Domain::Sync => "sync",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "chat" => Some(Domain::Chat),
            "agent" => Some(Domain::Agent),
            "graph" => Some(Domain::Graph),
            "mcp" => Some(Domain::Mcp),
            "artifact" => Some(Domain::Artifact),
            "system" => Some(Domain::System),
            "connector" => Some(Domain::Connector),
            "sync" => Some(Domain::Sync),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BusEvent {
    pub id: String,
    pub domain: Domain,
    pub action: String,
    pub payload: Value,
    pub source: String,
    pub timestamp: i64,
    pub conversation_id: Option<String>,
}

impl BusEvent {
    pub fn new(domain: Domain, action: &str, payload: Value, source: &str) -> Self {
        use std::time::{SystemTime, UNIX_EPOCH};
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            domain,
            action: action.to_string(),
            payload,
            source: source.to_string(),
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() as i64,
            conversation_id: None,
        }
    }

    pub fn with_conversation(mut self, conversation_id: &str) -> Self {
        self.conversation_id = Some(conversation_id.to_string());
        self
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Artifact {
    pub id: String,
    pub name: String,
    pub artifact_type: String,
    pub content: String,
    pub path: String,
    pub language: Option<String>,
    pub description: Option<String>,
    pub line_count: i32,
    pub status: String,
    pub conversation_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ArtifactSummary {
    pub id: String,
    pub name: String,
    pub artifact_type: String,
    pub path: String,
    pub description: Option<String>,
    pub line_count: i32,
    pub status: String,
    pub created_at: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_domain_as_str_roundtrip() {
        let variants = [
            Domain::Chat, Domain::Agent, Domain::Graph, Domain::Mcp,
            Domain::Artifact, Domain::System, Domain::Connector, Domain::Sync,
        ];
        for d in &variants {
            let s = d.as_str();
            let back = Domain::from_str(s);
            assert_eq!(back, Some(d.clone()), "failed for {s}");
        }
    }

    #[test]
    fn test_domain_from_str_invalid() {
        assert_eq!(Domain::from_str("invalid"), None);
        assert_eq!(Domain::from_str(""), None);
    }

    #[test]
    fn test_bus_event_new() {
        let event = BusEvent::new(
            Domain::Chat,
            "message_sent",
            serde_json::json!({"text": "hello"}),
            "frontend",
        );
        assert!(event.id.len() > 0);
        assert_eq!(event.domain, Domain::Chat);
        assert_eq!(event.action, "message_sent");
        assert_eq!(event.payload["text"], "hello");
        assert_eq!(event.source, "frontend");
        assert!(event.timestamp > 0);
        assert_eq!(event.conversation_id, None);
    }

    #[test]
    fn test_bus_event_with_conversation() {
        let event = BusEvent::new(Domain::Agent, "task", serde_json::json!({}), "test")
            .with_conversation("conv-123");
        assert_eq!(event.conversation_id, Some("conv-123".into()));
    }

    #[test]
    fn test_artifact_has_all_fields() {
        let a = Artifact {
            id: "a1".into(),
            name: "main.rs".into(),
            artifact_type: "code".into(),
            content: "fn main() {}".into(),
            path: "/src/main.rs".into(),
            language: Some("rust".into()),
            description: None,
            line_count: 1,
            status: "draft".into(),
            conversation_id: None,
            created_at: 100,
            updated_at: 100,
        };
        assert_eq!(a.artifact_type, "code");
        assert_eq!(a.language, Some("rust".into()));
    }

    #[test]
    fn test_artifact_summary_omits_content() {
        let s = ArtifactSummary {
            id: "a1".into(),
            name: "main.rs".into(),
            artifact_type: "code".into(),
            path: "/src/main.rs".into(),
            description: None,
            line_count: 1,
            status: "draft".into(),
            created_at: 100,
        };
        assert_eq!(s.name, "main.rs");
    }
}
