pub mod registry;
pub mod task;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use self::task::AgentTask;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentKind {
    Core,
    Data,
    Gis,
    Intelligence,
}

impl AgentKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Core => "core",
            Self::Data => "data",
            Self::Gis => "gis",
            Self::Intelligence => "intelligence",
        }
    }
}

#[derive(Debug, Clone)]
pub struct AgentContext {
    pub trace_id: String,
    pub project_id: String,
    pub workspace_id: String,
    pub user_initiated: bool,
}

#[derive(Debug, Clone)]
pub struct AgentOutput {
    pub summary: String,
    pub success: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum AgentError {
    #[error("LLM no disponible: {0}")]
    LlmUnavailable(String),
    #[error("Archivo corrupto: {0}")]
    CorruptFile(String),
    #[error("Token OAuth expirado")]
    OAuthExpired,
    #[error("Timeout después de {0}s")]
    Timeout(u64),
    #[error("Base de datos: {0}")]
    Database(String),
    #[error("{0}")]
    Other(String),
}

impl AgentError {
    pub fn is_retryable(&self) -> bool {
        matches!(self, Self::LlmUnavailable(_) | Self::OAuthExpired | Self::Timeout(_))
    }
}

#[async_trait]
pub trait AgentTrait: Send + Sync {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
    fn kind(&self) -> AgentKind;
    async fn execute(
        &self,
        task: &AgentTask,
        ctx: &AgentContext,
    ) -> Result<AgentOutput, AgentError>;
}
