use super::schema::{is_container_tool, container_tools_schema};
use super::{CONTAINERS_MCP_ID, CONTAINER_TOOLS, McpToolSchema};

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
