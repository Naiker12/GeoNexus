use serde_json::{json, Value};

use crate::types::{McpServer, McpTool};

/// Prefijo de tools MCP expuestas al LLM (mismo array que tools locales).
pub const MCP_TOOL_PREFIX: &str = "mcp__";

pub fn sanitize_tool_segment(value: &str) -> String {
    value
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

pub fn build_mcp_tool_name(server_id: &str, tool_name: &str) -> String {
    format!(
        "{}{}__{}",
        MCP_TOOL_PREFIX,
        sanitize_tool_segment(server_id),
        sanitize_tool_segment(tool_name)
    )
}

pub fn resolve_mcp_tool_name<'a>(
    llm_name: &str,
    catalog: &'a [(McpServer, McpTool)],
) -> Option<(&'a McpServer, &'a McpTool)> {
    if !llm_name.starts_with(MCP_TOOL_PREFIX) {
        return None;
    }
    catalog
        .iter()
        .find(|(server, tool)| build_mcp_tool_name(&server.id, &tool.name) == llm_name)
        .map(|(server, tool)| (server, tool))
}

pub fn normalize_tool_parameters(schema: Option<&Value>) -> Value {
    match schema {
        Some(s) if s.is_object() => {
            if s.get("type").is_some() && s.get("properties").is_some() {
                s.clone()
            } else if s.get("properties").is_some() {
                json!({
                    "type": "object",
                    "properties": s.get("properties").cloned().unwrap_or(json!({})),
                    "required": s.get("required").cloned().unwrap_or(json!([])),
                })
            } else {
                json!({
                    "type": "object",
                    "properties": {},
                })
            }
        }
        _ => json!({
            "type": "object",
            "properties": {},
        }),
    }
}

pub fn mcp_tool_to_llm_definition(server: &McpServer, tool: &McpTool) -> Value {
    let name = build_mcp_tool_name(&server.id, &tool.name);
    let description = tool
        .description
        .as_deref()
        .filter(|d| !d.is_empty())
        .unwrap_or("Herramienta MCP externa");
    let full_description = format!(
        "[MCP · {}] {} — Servidor: {} ({})",
        tool.name, description, server.name, server.id
    );
    json!({
        "type": "function",
        "function": {
            "name": name,
            "description": full_description,
            "parameters": normalize_tool_parameters(tool.args_schema.as_ref()),
        }
    })
}

pub fn format_mcp_tool_result(data: &Value) -> String {
    if let Some(content) = data.get("content").and_then(|c| c.as_array()) {
        let parts: Vec<String> = content
            .iter()
            .filter_map(|block| {
                block
                    .get("text")
                    .and_then(|t| t.as_str())
                    .map(String::from)
                    .or_else(|| serde_json::to_string(block).ok())
            })
            .collect();
        if !parts.is_empty() {
            return parts.join("\n");
        }
    }
    serde_json::to_string_pretty(data).unwrap_or_else(|_| data.to_string())
}
