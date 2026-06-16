use super::{GetUpdatesResponse, Update};
use reqwest::Client;
use std::time::Duration;

pub async fn get_updates(
    client: &Client,
    token: &str,
    offset: i64,
    timeout: u64,
) -> Result<Vec<Update>, String> {
    let url = format!("https://api.telegram.org/bot{}/getUpdates", token);
    
    let response = client
        .get(&url)
        .query(&[("offset", offset), ("timeout", timeout as i64)])
        .send()
        .await
        .map_err(|e| format!("Error al obtener updates: {}", e))?;
    
    let updates_response: GetUpdatesResponse = response
        .json()
        .await
        .map_err(|e| format!("Error al parsear updates: {}", e))?;
    
    if !updates_response.ok {
        return Err("Respuesta no ok de Telegram API".into());
    }
    
    Ok(updates_response.result)
}

pub async fn start_polling_loop<F, Fut>(
    token: String,
    mut handler: F,
) where
    F: FnMut(Update) -> Fut + Send + 'static,
    Fut: std::future::Future<Output = ()> + Send + 'static,
{
    let client = Client::new();
    let mut offset: i64 = 0;
    
    loop {
        match get_updates(&client, &token, offset, 30).await {
            Ok(updates) => {
                for update in updates {
                    offset = update.update_id + 1;
                    handler(update).await;
                }
            }
            Err(e) => {
                eprintln!("Error en polling: {}", e);
                tokio::time::sleep(Duration::from_secs(1)).await;
            }
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
}
