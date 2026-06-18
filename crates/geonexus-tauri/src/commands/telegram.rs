use tauri::{AppHandle, Emitter, State};
use crate::AppState;
use geonexus_core::telegram::{
    polling::start_polling_loop,
    sender::{get_me, send_message},
    TelegramConfig, Update,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelegramStatus {
    pub is_running: bool,
    pub bot_name: Option<String>,
    pub error: Option<String>,
}

pub struct TelegramState {
    pub polling_task: Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
    pub config: Mutex<Option<TelegramConfig>>,
    pub is_running: Mutex<bool>,
}

impl Default for TelegramState {
    fn default() -> Self {
        Self {
            polling_task: Mutex::new(None),
            config: Mutex::new(None),
            is_running: Mutex::new(false),
        }
    }
}

#[tauri::command]
pub async fn telegram_save_config(
    state: State<'_, AppState>,
    token: String,
    allowed_users: Vec<String>,
    response_mode: String,
) -> Result<(), String> {
    let config = TelegramConfig {
        bot_token: token,
        allowed_users,
        response_mode,
    };
    
    let config_json = serde_json::to_string(&config).map_err(|e| e.to_string())?;
    
    sqlx::query(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
    )
    .bind("telegram_config")
    .bind(&config_json)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn telegram_load_config(state: State<'_, AppState>) -> Result<Option<TelegramConfig>, String> {
    let row: Option<(String,)> = sqlx::query_as("SELECT value FROM app_settings WHERE key = ?1")
        .bind("telegram_config")
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    
    match row {
        Some((value,)) if !value.is_empty() => {
            let config: TelegramConfig = serde_json::from_str(&value).map_err(|e| e.to_string())?;
            Ok(Some(config))
        }
        _ => Ok(None),
    }
}

#[tauri::command]
pub async fn telegram_start_polling(
    app: AppHandle,
    state: State<'_, AppState>,
    tg_state: State<'_, TelegramState>,
) -> Result<String, String> {
    let config = telegram_load_config(state).await?;
    let config = config.ok_or_else(|| "Config de Telegram no encontrada".to_string())?;
    
    let client = Client::new();
    let bot_info = get_me(&client, &config.bot_token).await?;
    let bot_name = bot_info.username.clone().unwrap_or_else(|| bot_info.first_name.clone());
    
    {
        let mut tg_config = tg_state.config.lock().unwrap();
        *tg_config = Some(config.clone());
    }
    
    let token_clone = config.bot_token.clone();
    let app_clone = app.clone();
    
    let allowed_users = config.allowed_users.clone();
    
    let handle = tauri::async_runtime::spawn(async move {
        start_polling_loop(token_clone, move |update: Update| {
            let app = app_clone.clone();
            let allowed_users = allowed_users.clone();
            async move {
                handle_update(update, app, &allowed_users).await;
            }
        })
        .await;
    });
    
    {
        let mut task = tg_state.polling_task.lock().unwrap();
        *task = Some(handle);
        let mut is_running = tg_state.is_running.lock().unwrap();
        *is_running = true;
    }
    
    Ok(bot_name)
}

#[tauri::command]
pub async fn telegram_stop_polling(tg_state: State<'_, TelegramState>) -> Result<(), String> {
    let mut task = tg_state.polling_task.lock().unwrap();
    if let Some(handle) = task.take() {
        handle.abort();
    }
    let mut is_running = tg_state.is_running.lock().unwrap();
    *is_running = false;
    Ok(())
}

#[tauri::command]
pub async fn telegram_get_status(
    state: State<'_, AppState>,
    tg_state: State<'_, TelegramState>,
) -> Result<TelegramStatus, String> {
    // Leer is_running primero y soltar el lock antes del await
    let is_running = {
        let is_running = tg_state.is_running.lock().unwrap();
        *is_running
    };
    
    let config = telegram_load_config(state).await?;
    let (bot_name, error) = if let Some(config) = config {
        let client = Client::new();
        match get_me(&client, &config.bot_token).await {
            Ok(me) => (Some(me.username.unwrap_or(me.first_name)), None),
            Err(e) => (None, Some(e)),
        }
    } else {
        (None, Some("Config no encontrada".into()))
    };
    
    Ok(TelegramStatus {
        is_running,
        bot_name,
        error,
    })
}

#[tauri::command]
pub async fn telegram_send_message(
    chat_id: i64,
    text: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config = telegram_load_config(state).await?;
    let config = config.ok_or_else(|| "Config de Telegram no encontrada".to_string())?;
    
    let client = Client::new();
    send_message(&client, &config.bot_token, chat_id, &text, Some("MarkdownV2")).await?;
    
    Ok(())
}

async fn handle_update(update: Update, app: AppHandle, allowed_users: &[String]) {
    if let Some(message) = update.message {
        let user_id = message.from.id.to_string();
        let username = message.from.username.as_deref();
        
        let is_allowed = allowed_users.is_empty()
            || allowed_users.contains(&user_id)
            || username.map(|u| allowed_users.contains(&format!("@{}", u))).unwrap_or(false);
        
        if !is_allowed {
            return;
        }
        
        if let Some(text) = message.text {
            let payload = serde_json::json!({
                "chat_id": message.chat.id,
                "user_id": message.from.id,
                "username": message.from.username,
                "text": text,
            });
            
            let _ = app.emit("telegram:message", payload);
        }
    }
}




