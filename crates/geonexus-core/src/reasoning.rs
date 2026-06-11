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
