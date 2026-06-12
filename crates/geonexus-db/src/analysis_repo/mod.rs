pub mod metrics;
pub mod cost;
pub mod export;

pub use metrics::{get_analysis_metrics, get_token_timeline, get_model_usage, list_analysis_runs, get_skill_usage};
pub use cost::{get_cost_by_timeframe, get_top_queries};
pub use export::{export_traces_as_csv, export_traces_as_json};

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct AnalysisMetrics {
    pub tokens_hoy: i64,
    pub consultas_ia: i64,
    pub costo_estimado: f64,
    pub trazas_guardadas: i64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct TokenBucket {
    pub hora: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub total_tokens: i64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct ModelUsage {
    pub model: String,
    pub provider: String,
    pub tokens: i64,
    pub requests: i64,
    pub input_tokens: i64,
    pub output_tokens: i64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct AnalysisRun {
    pub id: String,
    pub conversation_id: String,
    pub title: String,
    pub model: String,
    pub tokens: i64,
    pub duration_ms: i64,
    pub trace_id: Option<String>,
    pub tool_calls: i64,
    pub created_at: i64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct SkillUsage {
    pub tool_name: String,
    pub calls: i64,
    pub success_rate: f64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct CostSummary {
    pub cost_hoy: f64,
    pub cost_7d: f64,
    pub cost_total: f64,
    pub avg_per_query: f64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct TopQuery {
    pub title: String,
    pub runs: i64,
    pub tokens: i64,
}
