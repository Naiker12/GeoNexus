use serde::{Deserialize, Serialize};

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

pub fn is_container_tool(tool_name: &str) -> bool {
    CONTAINER_TOOLS.contains(&tool_name)
}

pub fn container_tools_schema() -> Vec<McpToolSchema> {
    vec![
        tool(
            "container_list",
            "Lista archivos de un contenedor conectado.",
            serde_json::json!({
                "type": "object",
                "properties": {
                    "provider": provider_schema(),
                    "project_id": {"type": "string"},
                    "connector_id": {"type": "string"},
                    "path": {"type": "string", "default": "/"}
                },
                "required": ["provider"]
            }),
        ),
        tool(
            "container_get",
            "Cachea un archivo de un contenedor y lo registra como asset del proyecto.",
            serde_json::json!({
                "type": "object",
                "properties": {
                    "provider": provider_schema(),
                    "connector_id": {"type": "string"},
                    "file_id": {"type": "string"}
                },
                "required": ["provider", "file_id"]
            }),
        ),
        tool(
            "container_search",
            "Busca archivos por nombre o ruta en un contenedor.",
            serde_json::json!({
                "type": "object",
                "properties": {
                    "provider": provider_schema(),
                    "project_id": {"type": "string"},
                    "connector_id": {"type": "string"},
                    "query": {"type": "string"}
                },
                "required": ["provider", "query"]
            }),
        ),
        tool(
            "container_sync",
            "Sincroniza metadata de un conector local. Requiere confirmacion explicita.",
            serde_json::json!({
                "type": "object",
                "properties": {
                    "provider": provider_schema(),
                    "connector_id": {"type": "string"},
                    "remote_path": {"type": "string"},
                    "local_dir": {"type": "string"},
                    "confirmed": {"type": "boolean", "default": false}
                },
                "required": ["provider"]
            }),
        ),
        tool(
            "container_upload",
            "Prepara una subida a un contenedor. Siempre requiere confirmacion explicita.",
            serde_json::json!({
                "type": "object",
                "properties": {
                    "provider": provider_schema(),
                    "path": {"type": "string"},
                    "local_path": {"type": "string"},
                    "confirmed": {"type": "boolean", "default": false}
                },
                "required": ["provider", "path", "local_path"]
            }),
        ),
    ]
}

fn provider_schema() -> serde_json::Value {
    serde_json::json!({
        "type": "string",
        "enum": ["local", "onedrive", "google_drive", "sharepoint", "dropbox", "s3"]
    })
}

fn tool(name: &str, description: &str, input_schema: serde_json::Value) -> McpToolSchema {
    McpToolSchema {
        name: name.to_string(),
        description: description.to_string(),
        input_schema,
    }
}
