use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub kind: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub config: String,
    pub model: Option<String>,
    pub provider: Option<String>,
    pub model_name: Option<String>,
    pub last_run_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}
