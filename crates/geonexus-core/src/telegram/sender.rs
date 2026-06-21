use super::{GetMeResponse, SendMessageResponse, User};
use reqwest::Client;

pub fn escape_markdown_v2(text: &str) -> String {
    let mut result = String::with_capacity(text.len() + 8);
    let mut in_code = false;
    let bytes = text.as_bytes();
    let len = bytes.len();
    let mut i = 0;

    while i < len {
        if bytes[i] == b'`' {
            let mut count = 0;
            while i < len && bytes[i] == b'`' {
                count += 1;
                i += 1;
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
            match bytes[i] {
                b'_' | b'*' | b'[' | b']' | b'(' | b')' | b'~' | b'>'
                | b'#' | b'+' | b'-' | b'=' | b'|' | b'{' | b'}' | b'.'
                | b'!' => result.push('\\'),
                _ => {}
            }
        }
        result.push(bytes[i] as char);
        i += 1;
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

    let send_response: SendMessageResponse = response
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
        .map_err(|e| format!("Error al obtener info del bot: {}", e))?;

    let get_me_response: GetMeResponse = response
        .json()
        .await
        .map_err(|e| format!("Error al parsear getMe: {}", e))?;

    if !get_me_response.ok {
        return Err("Respuesta no ok de getMe".into());
    }

    Ok(get_me_response.result)
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
