use serde::{Deserialize, Serialize};

pub mod schema;

#[cfg(test)]
mod tests;

pub use schema::{is_container_tool, container_tools_schema};

pub const CONTAINERS_MCP_ID: &str = "containers-mcp";

pub const CONTAINER_TOOLS: &[&str] = &[
    "container_list",
    "container_get",
    "container_search",
    "container_sync",
    "container_upload",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpToolSchema {
    pub name: String,
    pub description: String,
    #[serde(rename = "inputSchema")]
    pub input_schema: serde_json::Value,
}
