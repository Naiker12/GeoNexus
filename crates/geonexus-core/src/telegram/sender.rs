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
