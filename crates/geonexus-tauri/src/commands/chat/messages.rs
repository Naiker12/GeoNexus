use geonexus_core::chat::{Message, MessageRole};
use serde_json::json;

/// Construye el array de mensajes para el LLM con contexto del proyecto, web search y RAG.
pub fn build_messages(
    history: &[Message],
    project_context: &str,
    web_context: &str,
    rag_context: &str,
    skills_context: &str,
    user_content: &str,
    skill_names: &[String],
    asset_count: usize,
) -> Vec<serde_json::Value> {
    let mut messages = vec![];

    let msg_count = history.len();
    let has_history = msg_count > 0;
    let skills_note = if skill_names.is_empty() {
        String::new()
    } else {
        format!(" Skills activos en esta sesión: {}.", skill_names.join(", "))
    };
    let assets_note = if asset_count > 0 {
        format!(" {} fuentes de datos referenciadas.", asset_count)
    } else {
        String::new()
    };
    let first_msg_instruction = if !has_history {
        "Preséntate brevemente como Geo Agents, asistente de análisis geoespacial.".to_string()
    } else {
        format!(
            "Esta conversación tiene {} mensajes previos. \
             Haz referencia a lo que se habló antes: 'Como vimos anteriormente...', \
             'Continuando con el análisis de...'. \
             Varía tu apertura, no siempre empieces igual. \
             Menciona explícitamente qué skills o fuentes estás usando.",
            msg_count
        )
    };

    messages.push(json!({
        "role": "system",
        "content": format!(
            "Eres Geo Agents, un asistente experto en analisis territorial, \
             normativa urbana, GIS, y gestion de conocimiento geoespacial. \
             Responde en espanol claro y directo. \
             Usa el contexto del proyecto cuando sea relevante. \
             Si no tienes informacion suficiente, indicalo claramente. \
             Puedes usar herramientas (read_file, search_code, \
             list_directory, glob_files) para explorar archivos del proyecto. \
             Usa texto plano. Separa listas con guiones. \
             Codigo en bloque con triple backtick.\n\n\
             ## Comportamiento conversacional\n\
             {} \
             {}{}\n\
             Cuando uses un skill, menciona explícitamente cuál estás aplicando. \
             Cuando consultes datos, menciona qué fuentes usaste. \
             Cuando no encuentres información, sé específico sobre qué faltó.",
            first_msg_instruction, skills_note, assets_note
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

    if !skills_context.is_empty() {
        messages.push(json!({
            "role": "system",
            "content": skills_context,
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
