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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_container_tool_reconoce_todos_los_tools() {
        for tool_name in CONTAINER_TOOLS {
            assert!(is_container_tool(tool_name), "deberia reconocer {tool_name}");
        }
    }

    #[test]
    fn is_container_tool_rechaza_tool_desconocido() {
        assert!(!is_container_tool("tool_inexistente"));
        assert!(!is_container_tool(""));
        assert!(!is_container_tool("chat_llm"));
    }

    #[test]
    fn container_tools_schema_retorna_cinco_tools() {
        let schemas = container_tools_schema();
        assert_eq!(schemas.len(), 5);
    }

    #[test]
    fn container_tools_schema_todos_tienen_name_description_y_input_schema() {
        for tool in container_tools_schema() {
            assert!(!tool.name.is_empty(), "name no debe estar vacio");
            assert!(!tool.description.is_empty(), "description no debe estar vacia");
            assert!(tool.input_schema.is_object(), "input_schema debe ser object");
        }
    }

    #[test]
    fn container_tools_schema_todos_tienen_required_en_input_schema() {
        for tool in container_tools_schema() {
            let req = tool.input_schema["required"].as_array();
            assert!(req.is_some(), "{}.input_schema debe tener required", tool.name);
            assert!(!req.unwrap().is_empty(), "{}.required no debe estar vacio", tool.name);
        }
    }

    #[test]
    fn container_tools_schema_provider_siempre_incluye_enum_local() {
        for tool in container_tools_schema() {
            let props = tool.input_schema["properties"].as_object();
            if let Some(props) = props {
                if let Some(provider) = props.get("provider") {
                    let provider_enum = provider["enum"].as_array();
                    assert!(provider_enum.is_some());
                    let values: Vec<&str> = provider_enum
                        .unwrap()
                        .iter()
                        .filter_map(|v| v.as_str())
                        .collect();
                    assert!(
                        values.contains(&"local"),
                        "{} provider.enum debe contener 'local'",
                        tool.name
                    );
                }
            }
        }
    }

    #[test]
    fn mcp_tool_schema_serializa_input_schema_con_input_schema_key() {
        let schema = McpToolSchema {
            name: "test".into(),
            description: "desc".into(),
            input_schema: serde_json::json!({"type": "object"}),
        };
        let json = serde_json::to_value(&schema).unwrap();
        assert_eq!(json["name"], "test");
        assert!(json.get("inputSchema").is_some(), "debe serializar como inputSchema (camelCase)");
        assert_eq!(json["inputSchema"]["type"], "object");
    }

    #[test]
    fn containers_mcp_id_es_la_constante() {
        assert_eq!(CONTAINERS_MCP_ID, "containers-mcp");
        assert_eq!(CONTAINER_TOOLS.len(), 5);
    }
}
