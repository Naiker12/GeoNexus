use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllowlistRule {
    pub id: String,
    pub server_id: String,
    pub tool_name: String,
    pub allowed: bool,
    pub rate_limit: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AllowlistRuleRow {
    pub id: String,
    pub server_id: String,
    pub tool_name: String,
    pub allowed: i32,
    pub rate_limit: Option<i32>,
}

impl From<AllowlistRuleRow> for AllowlistRule {
    fn from(row: AllowlistRuleRow) -> Self {
        AllowlistRule {
            id: row.id,
            server_id: row.server_id,
            tool_name: row.tool_name,
            allowed: row.allowed != 0,
            rate_limit: row.rate_limit,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct UpsertAllowlistPayload {
    pub server_id: String,
    pub tool_name: Option<String>,
    pub allowed: bool,
    pub rate_limit: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum McpStatus {
    Online,
    Offline,
    Pending,
    Degraded,
}

impl McpStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            McpStatus::Online => "online",
            McpStatus::Offline => "offline",
            McpStatus::Pending => "pending",
            McpStatus::Degraded => "degraded",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "online" => McpStatus::Online,
            "offline" => McpStatus::Offline,
            "degraded" => McpStatus::Degraded,
            _ => McpStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ToolStatus {
    Ready,
    Guarded,
    Planned,
}

impl ToolStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            ToolStatus::Ready => "ready",
            ToolStatus::Guarded => "guarded",
            ToolStatus::Planned => "planned",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "ready" => ToolStatus::Ready,
            "guarded" => ToolStatus::Guarded,
            _ => ToolStatus::Planned,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct McpServerRow {
    pub id: String,
    pub name: String,
    pub url: String,
    pub status: String,
    pub auth_type: Option<String>,
    pub auth_ref: Option<String>,
    pub latency_ms: Option<i32>,
    pub error_count: i32,
    pub description: Option<String>,
    pub last_ping_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServer {
    pub id: String,
    pub name: String,
    pub url: String,
    pub status: McpStatus,
    pub auth_type: Option<String>,
    pub auth_ref: Option<String>,
    pub latency_ms: Option<i32>,
    pub error_count: i32,
    pub description: Option<String>,
    pub last_ping_at: Option<String>,
}

impl From<McpServerRow> for McpServer {
    fn from(row: McpServerRow) -> Self {
        McpServer {
            status: McpStatus::from_str(&row.status),
            id: row.id,
            name: row.name,
            url: row.url,
            auth_type: row.auth_type,
            auth_ref: row.auth_ref,
            latency_ms: row.latency_ms,
            error_count: row.error_count,
            description: row.description,
            last_ping_at: row.last_ping_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct McpToolRow {
    pub id: String,
    pub server_id: String,
    pub name: String,
    pub description: Option<String>,
    pub args_schema: Option<String>,
    pub return_type: Option<String>,
    pub status: String,
    pub category: Option<String>,
    pub args: Option<String>,
    pub result: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpTool {
    pub id: String,
    pub server_id: String,
    pub name: String,
    pub description: Option<String>,
    pub args_schema: Option<serde_json::Value>,
    pub return_type: Option<String>,
    pub status: ToolStatus,
    pub category: Option<String>,
    pub args: Option<String>,
    pub result: Option<String>,
}

impl From<McpToolRow> for McpTool {
    fn from(row: McpToolRow) -> Self {
        McpTool {
            status: ToolStatus::from_str(&row.status),
            id: row.id,
            server_id: row.server_id,
            name: row.name,
            description: row.description,
            args_schema: row.args_schema.and_then(|s| serde_json::from_str(&s).ok()),
            return_type: row.return_type,
            category: row.category,
            args: row.args,
            result: row.result,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct RegisterServerPayload {
    pub id: String,
    pub name: String,
    pub url: String,
    pub auth_type: Option<String>,
    pub auth_ref: Option<String>,
    pub tools: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct CallToolPayload {
    pub server_id: String,
    pub tool: String,
    pub args: serde_json::Value,
    pub trace_id: String,
    pub agent_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CallToolResult {
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
    pub duration_ms: u64,
}

#[derive(Debug, Serialize)]
pub struct PingResult {
    pub online: bool,
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}
