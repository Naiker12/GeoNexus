use geonexus_core::chat::{Message, MessageRole};
use serde_json::json;

#[allow(dead_code)]
pub fn build_prompt(history: &[Message], project_context: &str, rag_context: &str) -> String {
    let mut lines = vec![
        "Eres GeoNexus IA. Responde en espanol claro y con criterio tecnico.".to_string(),
        "Si no tienes contexto documental suficiente, dilo sin inventar citas.".to_string(),
    ];

    if !project_context.is_empty() {
        lines.push(format!("\nResumen del proyecto actual:\n{}", project_context));
    }

    if !rag_context.is_empty() {
        lines.push(rag_context.to_string());
    }

    let start = history.len().saturating_sub(20);
    for message in &history[start..] {
        let role = match message.role {
            MessageRole::User => "Usuario",
            MessageRole::Assistant => "GeoNexus IA",
            MessageRole::Tool => "Tool",
            MessageRole::System => "Sistema",
        };
        lines.push(format!("{role}: {}", message.content.trim()));
    }

    lines.push("GeoNexus IA:".into());
    lines.join("\n")
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
            "Eres GeoNexus IA. Responde en espanol claro y con criterio tecnico. ",
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
