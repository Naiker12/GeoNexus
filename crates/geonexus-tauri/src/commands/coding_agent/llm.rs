use crate::commands::llm::run_sidecar;
use super::types::{LLMPlan, ClarifyingQuestion};

/// Extracts JSON from LLM response (handles ```json code blocks).
fn extract_json_from_llm(content: &str) -> String {
    let content = content.trim();
    if content.starts_with("```") {
        let lines: Vec<&str> = content.lines().collect();
        let start = if lines.first().map_or(false, |l| l.starts_with("```")) { 1 } else { 0 };
        let end = if lines.last().map_or(false, |l| l.starts_with("```")) {
            if lines.len() > start { lines.len() - 1 } else { lines.len() }
        } else {
            lines.len()
        };
        lines[start..end].join("\n")
    } else {
        content.to_string()
    }
}

fn parse_llm_response(output: &str) -> Result<serde_json::Value, String> {
    let parsed: serde_json::Value = serde_json::from_str(output)
        .map_err(|e| format!("Error parseando respuesta del LLM: {}. Output: {}", e, &output[..output.len().min(500)]))?;

    if parsed.get("status").and_then(|s| s.as_str()) == Some("error") {
        let msg = parsed.get("message").and_then(|m| m.as_str()).unwrap_or("Error desconocido del LLM");
        return Err(format!("LLM error: {}", msg));
    }

    let message = parsed.get("message")
        .or_else(|| parsed.get("msg"))
        .ok_or_else(|| format!("Respuesta LLM sin campo 'message'. Output: {}", &output[..output.len().min(500)]))?;

    let content = message.get("content")
        .and_then(|c| c.as_str())
        .ok_or_else(|| format!("Respuesta LLM sin contenido. Output: {}", &output[..output.len().min(500)]))?;

    let json_str = extract_json_from_llm(content);
    serde_json::from_str(&json_str)
        .map_err(|e| format!("Error parseando JSON del LLM: {}. JSON: {}", e, &json_str[..json_str.len().min(300)]))
}

pub async fn call_llm_for_plan(
    description: &str,
    project_context: &str,
    provider_type: &str,
    model: &str,
    endpoint: &str,
    api_key: Option<&str>,
) -> Result<LLMPlan, String> {
    let system_prompt = format!(
        r#"Eres un agente de codigo experto. Tu tarea es analizar el requerimiento del usuario y producir un plan detallado.

Contexto del proyecto actual:
{}

Principio fundamental: MINIMO CODIGO NECESARIO.
Antes de proponer cualquier archivo, recorre esta escalera:
  1. ¿Esto necesita construirse? Si es especulativo, no lo incluyas.
  2. ¿La libreria estandar ya lo hace? Usala (CSS nativo, HTML semantico, JS vanilla).
  3. ¿Una caracteristica nativa de HTML/CSS cubre esto? Preferila (ej: <input type="date"> en vez de date picker externo).
  4. ¿Puede ser una linea? Que sea una linea.
  5. Solo entonces: escribe el minimo codigo que funcione.

Sin abstracciones no solicitadas, sin dependencias nuevas evitables,
sin boilerplate que nadie pidio. Prefiere borrar sobre anadir.

Reglas:
1. Devuelve SOLO JSON valido, sin explicaciones ni markdown adicional.
2. El JSON debe tener esta estructura exacta:
{{
  "summary": "Resumen de lo que se va a construir",
  "files": [
    {{
      "path": "ruta/del/archivo",
      "language": "html|css|js|ts|py|rs|json|md|etc",
      "shortDescription": "que hace este archivo",
      "content": "contenido completo del archivo",
      "risk": "low" si es un archivo nuevo en agent-projects, "high" si sobrescribe algo existente,
      "reason": "por que se crea o modifica este archivo"
    }}
  ]
}}

EXCEPCION CRITICA: La regla de "minimo codigo" NO aplica a:
  - Validacion de entrada en limites de confianza
  - Manejo de errores que previene perdida de datos
  - Seguridad (sanitizacion, escapado, permisos)
  - Accesibilidad (aria, semantic HTML, contraste)
  - NADA explicitamente solicitado por el usuario
En estos casos, escribe el codigo completo y correcto, aunque sea mas largo.

Requerimiento del usuario: {}
"#,
        project_context, description
    );

    let messages = serde_json::json!([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": description}
    ]);

    let mut args = vec![
        "--action".to_string(),
        "chat_llm".to_string(),
        "--provider_type".to_string(),
        provider_type.to_string(),
        "--base_url".to_string(),
        endpoint.to_string(),
        "--model".to_string(),
        model.to_string(),
        "--messages".to_string(),
        messages.to_string(),
    ];

    if let Some(key) = api_key {
        if !key.is_empty() {
            args.push("--api_key".to_string());
            args.push(key.to_string());
        }
    }

    let output = run_sidecar(
        &args.iter().map(String::as_str).collect::<Vec<_>>(),
    )?;

    let value = parse_llm_response(&output)?;
    let plan: LLMPlan = serde_json::from_value(value)
        .map_err(|e| format!("Error parseando plan JSON del LLM: {}", e))?;
    Ok(plan)
}

pub async fn call_llm_for_clarification(
    description: &str,
    provider_type: &str,
    model: &str,
    endpoint: &str,
    api_key: Option<&str>,
) -> Result<Vec<ClarifyingQuestion>, String> {
    let json_example = r#"{
  "questions": [
    {
      "id": "q1",
      "question": "Texto de la pregunta"
    }
  ]
}"#;
    let system_prompt = format!(
        "Eres un analista de requerimientos experto. Tu tarea es generar preguntas aclaratorias\npara entender mejor lo que el usuario necesita construir.\n\nReglas:\n1. Genera entre 2 y 4 preguntas relevantes sobre el proyecto.\n2. Las preguntas deben ayudar a definir: alcance, tecnologia, diseno, funcionalidades.\n3. Devuelve SOLO JSON valido, sin explicaciones ni markdown.\n4. El JSON debe tener esta estructura exacta:\n{}\n\nRequerimiento del usuario: {}",
        json_example,
        description
    );

    let messages = serde_json::json!([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": description}
    ]);

    let mut args = vec![
        "--action".to_string(),
        "chat_llm".to_string(),
        "--provider_type".to_string(),
        provider_type.to_string(),
        "--base_url".to_string(),
        endpoint.to_string(),
        "--model".to_string(),
        model.to_string(),
        "--messages".to_string(),
        messages.to_string(),
    ];

    if let Some(key) = api_key {
        if !key.is_empty() {
            args.push("--api_key".to_string());
            args.push(key.to_string());
        }
    }

    let output = run_sidecar(
        &args.iter().map(String::as_str).collect::<Vec<_>>(),
    )?;

    let value = parse_llm_response(&output)?;

    #[derive(serde::Deserialize)]
    struct QuestionsResponse {
        questions: Vec<ClarifyingQuestion>,
    }

    let resp: QuestionsResponse = serde_json::from_value(value)
        .map_err(|e| format!("Error parseando preguntas del LLM: {}", e))?;
    Ok(resp.questions)
}
