use geonexus_core::reasoning::QueryIntent;

use super::ContextNode;

#[derive(Debug, Clone)]
pub struct ContextEdge {
    pub source_label: String,
    pub target_label: String,
    pub relation: String,
}

/// Returns (context_string, filtered_node_ids).
pub fn build_graph_context(nodes: &[ContextNode], edges: &[ContextEdge], intent: &QueryIntent) -> (String, Vec<String>) {
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

    let ids: Vec<String> = filtered.iter().map(|n| n.id.clone()).collect();

    if parts.is_empty() {
        (String::new(), ids)
    } else {
        (parts.join("\n"), ids)
    }
}
