use super::{GetMeResponse, SendMessageResponse, SimpleResponse, User};
use reqwest::Client;
use serde::Serialize;

#[derive(Serialize)]
struct BotCommand {
    command: String,
    description: String,
}

pub fn escape_markdown_v2(text: &str) -> String {
    let mut result = String::with_capacity(text.len() + 8);
    let mut in_code = false;
    let mut chars = text.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '`' {
            let mut count = 1;
            while let Some(next_c) = chars.peek() {
                if *next_c == '`' {
                    count += 1;
                    chars.next();
                } else {
                    break;
                }
            }
            if count >= 3 {
                in_code = !in_code;
            }
            for _ in 0..count {
                result.push('`');
            }
            continue;
        }

        if !in_code {
            match c {
                '_' | '*' | '[' | ']' | '(' | ')' | '~' | '>'
                | '#' | '+' | '-' | '=' | '|' | '{' | '}' | '.'
                | '!' => result.push('\\'),
                _ => {}
            }
        }
        result.push(c);
    }

    result
}

pub async fn send_message(
    client: &Client,
    token: &str,
    chat_id: i64,
    text: &str,
    parse_mode: Option<&str>,
) -> Result<(), String> {
    let url = format!("https://api.telegram.org/bot{}/sendMessage", token);

    let mut params = vec![("chat_id", chat_id.to_string()), ("text", text.to_string())];
    if let Some(mode) = parse_mode {
        params.push(("parse_mode", mode.to_string()));
    }

    let response = client
        .post(&url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Error al enviar mensaje: {}", e))?;

    let send_response: SendMessageResponse = response
        .json()
        .await
        .map_err(|e| format!("Error al parsear respuesta: {}", e))?;

    if !send_response.ok {
        return Err("Respuesta no ok al enviar mensaje".into());
    }

    Ok(())
}

pub async fn send_chat_action(
    client: &Client,
    token: &str,
    chat_id: i64,
    action: &str,
) -> Result<(), String> {
    let url = format!("https://api.telegram.org/bot{}/sendChatAction", token);
    let params = [("chat_id", chat_id.to_string()), ("action", action.to_string())];

    let response = client
        .post(&url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Error al enviar chat action: {}", e))?;

    let send_response: SimpleResponse = response
        .json()
        .await
        .map_err(|e| format!("Error al parsear chat action: {}", e))?;

    if !send_response.ok {
        return Err("Respuesta no ok al enviar chat action".into());
    }

    Ok(())
}

pub async fn get_me(client: &Client, token: &str) -> Result<User, String> {
    let url = format!("https://api.telegram.org/bot{}/getMe", token);

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Error al obtener info del bot: {e}"))?;

    let get_me_response: GetMeResponse = response
        .json()
        .await
        .map_err(|e| format!("Error al parsear getMe: {e}"))?;

    if !get_me_response.ok {
        return Err("Respuesta no ok de getMe".into());
    }

    Ok(get_me_response.result)
}

pub async fn register_slash_commands(client: &Client, token: &str) -> Result<(), String> {
    let commands = vec![
        BotCommand {
            command: "estado".into(),
            description: "Estado general del sistema".into(),
        },
        BotCommand {
            command: "modelo".into(),
            description: "Ver o cambiar el LLM activo".into(),
        },
        BotCommand {
            command: "mcp".into(),
            description: "Listar o recargar servidores MCP".into(),
        },
        BotCommand {
            command: "agentes".into(),
            description: "Ver estado de los agentes".into(),
        },
        BotCommand {
            command: "memoria".into(),
            description: "Estadísticas de ChromaDB".into(),
        },
        BotCommand {
            command: "tarea".into(),
            description: "Crear o listar tareas del agente".into(),
        },
        BotCommand {
            command: "logs".into(),
            description: "Últimas líneas de log".into(),
        },
        BotCommand {
            command: "version".into(),
            description: "Versión de GeoNexus".into(),
        },
        BotCommand {
            command: "ayuda".into(),
            description: "Lista de comandos disponibles".into(),
        },
    ];

    let url = format!("https://api.telegram.org/bot{}/setMyCommands", token);
    let response = client
        .post(&url)
        .json(&serde_json::json!({ "commands": commands }))
        .send()
        .await
        .map_err(|e| format!("Error al registrar comandos: {e}"))?;

    let status = response.status();
    if !status.is_success() {
        let status_text = response.text().await.unwrap_or_else(|_| "".into());
        return Err(format!(
            "setMyCommands falló ({}): {}",
            status,
            status_text
        ));
    }

    Ok(())
}

pub fn sanitize_incoming_text(text: &str) -> String {
    const MAX_LEN: usize = 2000;
    let truncated: String = text.chars().take(MAX_LEN).collect();
    truncated
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .trim()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_escape_markdown_v2_normal() {
        let input = "Hello_World! This is *bold* and .dot.";
        let expected = "Hello\\_World\\! This is \\*bold\\* and \\.dot\\.";
        assert_eq!(escape_markdown_v2(input), expected);
    }

    #[test]
    fn test_escape_markdown_v2_code_block() {
        let input = "Some text\n```rust\nlet x = 1 + 2;\n```\nOutside *bold*";
        let expected = "Some text\n```rust\nlet x = 1 + 2;\n```\nOutside \\*bold\\*";
        assert_eq!(escape_markdown_v2(input), expected);
    }

    #[test]
    fn test_sanitize_incoming_text_removes_html() {
        let input = "<script>alert('xss')</script>Hola";
        let result = sanitize_incoming_text(input);
        assert!(!result.contains('<'));
        assert!(!result.contains('>'));
        assert!(result.contains("Hola"));
    }

    #[test]
    fn test_sanitize_incoming_text_truncates() {
        let input = "a".repeat(3000);
        let result = sanitize_incoming_text(&input);
        assert!(result.len() <= 2000);
    }
}
