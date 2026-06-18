use super::{GetMeResponse, SendMessageResponse, User};
use reqwest::Client;

pub async fn send_message(
    client: &Client,
    token: &str,
    chat_id: i64,
    text: &str,
    parse_mode: Option<&str>,
) -> Result<(), String> {
    let url = format!("https://api.telegram.org/bot{}/sendMessage", token);

    let escaped = match parse_mode {
        Some("MarkdownV2") => escape_markdown_v2(text),
        _ => text.to_string(),
    };

    let mut params = vec![("chat_id", chat_id.to_string()), ("text", escaped)];
    if let Some(mode) = parse_mode {
        params.push(("parse_mode", mode.to_string()));
    }

    let response = client
        .post(&url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Error al enviar mensaje: {}", e))?;

    if !parse_mode.is_some_and(|m| m == "MarkdownV2") {
        let send_response: SendMessageResponse = response
            .json()
            .await
            .map_err(|e| format!("Error al parsear respuesta: {}", e))?;
        if !send_response.ok {
            return Err("Respuesta no ok al enviar mensaje".into());
        }
        return Ok(());
    }

    // MarkdownV2: si falla, reintentar como texto plano
    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        eprintln!("[Telegram] MarkdownV2 falló, reintentando como texto plano: {body}");

        let fallback = client
            .post(&url)
            .form(&[("chat_id", chat_id.to_string()), ("text", text.to_string())])
            .send()
            .await
            .map_err(|e| format!("sendMessage fallback error: {e}"))?;

        let fb_resp: SendMessageResponse = fallback
            .json()
            .await
            .map_err(|e| format!("Error al parsear fallback: {e}"))?;
        if !fb_resp.ok {
            return Err("sendMessage falló incluso como texto plano".into());
        }
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

pub async fn send_chat_action(
    client: &Client,
    token: &str,
    chat_id: i64,
    action: &str,
) -> Result<(), String> {
    let url = format!("https://api.telegram.org/bot{}/sendChatAction", token);

    let response = client
        .post(&url)
        .form(&[("chat_id", chat_id.to_string()), ("action", action.to_string())])
        .send()
        .await
        .map_err(|e| format!("sendChatAction error: {e}"))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("sendChatAction falló: {body}"));
    }

    Ok(())
}

/// Escapa caracteres especiales para MarkdownV2 de Telegram
pub fn escape_markdown_v2(text: &str) -> String {
    const CHARS: &[char] = &[
        '_', '*', '[', ']', '(', ')', '~', '`', '>',
        '#', '+', '-', '=', '|', '{', '}', '.', '!',
    ];
    let mut result = String::with_capacity(text.len() * 2);
    for ch in text.chars() {
        if CHARS.contains(&ch) {
            result.push('\\');
        }
        result.push(ch);
    }
    result
}
