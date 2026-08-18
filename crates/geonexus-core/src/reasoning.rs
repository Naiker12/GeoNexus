use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QueryIntent {
    ConsultaNormativa,
    AnalisisEspacial,
    DescubrimientoDatos,
    MemoriaProyecto,
    GeneracionEntregable,
    ConsultaGeneral,
}

impl QueryIntent {
    pub fn label(&self) -> &'static str {
        match self {
            QueryIntent::ConsultaNormativa => "consulta_normativa",
            QueryIntent::AnalisisEspacial => "analisis_espacial",
            QueryIntent::DescubrimientoDatos => "descubrimiento_datos",
            QueryIntent::MemoriaProyecto => "memoria_proyecto",
            QueryIntent::GeneracionEntregable => "generacion_entregable",
            QueryIntent::ConsultaGeneral => "consulta_general",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub passed: bool,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisSession {
    pub id: String,
    pub project_id: String,
    pub workspace_id: Option<String>,
    pub title: String,
    pub objective: String,
    pub intent: String,
    pub datasets_used: String,
    pub nodes_consulted: String,
    pub tools_executed: String,
    pub key_findings: Option<String>,
    pub deliverables: Option<String>,
    pub conversation_id: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTraceEvent {
    pub r#type: String,
    pub id: String,
    pub parent_id: Option<String>,
    pub category: String,
    pub title: String,
    pub log: Option<String>,
    pub payload: Option<serde_json::Value>,
    pub duration: Option<u64>,
    pub user_friendly_summary: Option<String>,
    pub error: Option<String>,
    pub timestamp: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conversation_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReasoningDelta {
    pub conversation_id: String,
    pub message_id: String,
    pub delta: String,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReasoningEnd {
    pub conversation_id: String,
    pub message_id: String,
    pub full_text: String,
    pub duration_ms: u64,
}
