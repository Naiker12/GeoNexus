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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ArtifactType {
    Code,       // código generado
    Report,     // reporte markdown/PDF
    Map,        // GeoJSON, shapefile, mapa renderizado
    Dashboard,  // componente React generado
    GeoJson,    // datos geoespaciales
    Pdf,
    Csv,
    Image,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Artifact {
    pub id: String,
    pub session_id: String,
    pub name: String,
    pub artifact_type: ArtifactType,
    pub path: Option<String>,      // ruta en filesystem si aplica
    pub content: Option<String>,   // contenido inline si es pequeño
    pub metadata: serde_json::Value,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoEvent {
    pub id: String,           // UUID v4
    pub session_id: String,   // conversación activa
    pub timestamp: i64,       // unix ms
    pub event_type: EventType,
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EventType {
    // Pipeline
    PipelineStarted,
    PipelineCompleted,
    PipelineFailed,
    
    // Workers
    WorkerStarted,     // payload: { worker: "discovery", task: "..." }
    WorkerCompleted,   // payload: { worker, duration_ms, result_summary }
    WorkerFailed,      // payload: { worker, error }
    
    // Connectors  
    ConnectorUsed,     // payload: { connector: "onedrive", action: "search", result_count }
    
    // MCP
    McpCalled,         // payload: { server, tool, duration_ms }
    McpFailed,         // payload: { server, tool, error }
    
    // Artifacts
    ArtifactCreated,   // payload: { artifact_id, name, type }
    
    // Memory
    MemoryQueried,     // payload: { scope: "project", chunks_found }
    MemoryUpdated,
    
    // Telegram
    TelegramMessageReceived,
    TelegramMessageSent,
    
    // Tokens (streaming)
    LlmToken,         // payload: { token } — alta frecuencia, no persiste en SQLite
    LlmDone,          // payload: { total_tokens, duration_ms }
    LlmToolCall,      // payload: { tool_name, args }
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
}

