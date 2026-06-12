use geonexus_core::chat::{Message, MessageRole};
use geonexus_core::reasoning::QueryIntent;
use serde_json::json;

use super::ContextNode;

#[derive(Debug, Clone)]
pub struct ContextEdge {
    pub source_label: String,
    pub target_label: String,
    pub relation: String,
}

pub fn build_messages(
    history: &[Message],
    project_context: &str,
    web_context: &str,
    rag_context: &str,
    user_content: &str,
) -> Vec<serde_json::Value> {
    let mut messages = vec![];

    messages.push(json!({
        "role": "system",
        "content": concat!(
            "Eres Geo Agents. Responde en espanol claro y con criterio tecnico. ",
            "Puedes usar las herramientas disponibles para leer archivos y explorar ",
            "el codigo del proyecto cuando sea necesario."
        ),
    }));

    if !project_context.is_empty() {
        messages.push(json!({
            "role": "system",
            "content": format!("Resumen del proyecto actual:\n{}", project_context),
        }));
    }

    if !web_context.is_empty() {
        messages.push(json!({
            "role": "system",
            "content": format!(
                "Resultados de busqueda web (usa esta informacion actualizada si es relevante):\n{}",
                web_context,
            ),
        }));
    }

    if !rag_context.is_empty() {
        messages.push(json!({
            "role": "system",
            "content": rag_context,
        }));
    }

    let start = history.len().saturating_sub(20);
    for msg in &history[start..] {
        let role = match msg.role {
            MessageRole::User => "user",
            MessageRole::Assistant => "assistant",
            MessageRole::Tool => "tool",
            MessageRole::System => "system",
        };
        let mut entry = json!({
            "role": role,
            "content": msg.content.trim(),
        });
        if !msg.tool_calls.is_empty() {
            entry["tool_calls"] = serde_json::Value::Array(msg.tool_calls.clone());
        }
        messages.push(entry);
    }

    messages.push(json!({
        "role": "user",
        "content": user_content.trim(),
    }));

    messages
}

pub fn build_graph_context(nodes: &[ContextNode], edges: &[ContextEdge], intent: &QueryIntent) -> String {
    let filtered: Vec<&ContextNode> = match intent {
        QueryIntent::ConsultaNormativa => {
            nodes.iter().filter(|n| n.kind == "norma" || n.kind == "article").collect()
        }
        QueryIntent::AnalisisEspacial => {
            nodes.iter().filter(|n| n.kind == "capa" || n.kind == "layer" || n.kind == "geometry").collect()
        }
        QueryIntent::DescubrimientoDatos => {
            nodes.iter().filter(|n| n.kind == "capa" || n.kind == "file" || n.kind == "dataset").collect()
        }
        _ => nodes.iter().collect(),
    };

    let mut parts = vec![];

    if !filtered.is_empty() {
        parts.push("Nodos relevantes del grafo de conocimiento:".to_string());
        for n in &filtered {
            parts.push(format!("  - [{}] {}", n.kind, n.label));
        }
    }

    let relevant_edges: Vec<&ContextEdge> = if !matches!(intent, QueryIntent::ConsultaGeneral) {
        let labels: Vec<&str> = filtered.iter().map(|n| n.label.as_str()).collect();
        edges.iter()
            .filter(|e| labels.contains(&e.source_label.as_str()) || labels.contains(&e.target_label.as_str()))
            .collect()
    } else {
        edges.iter().take(5).collect()
    };

    if !relevant_edges.is_empty() {
        parts.push("\nRelaciones entre nodos del grafo de conocimiento:".to_string());
        for e in &relevant_edges {
            parts.push(format!("  - {} --[{}]--> {}", e.source_label, e.relation, e.target_label));
        }
    }

    if parts.is_empty() {
        String::new()
    } else {
        parts.join("\n")
    }
}
