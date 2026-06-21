use crate::AppState;
use geonexus_core::crypto::{decrypt_token, encrypt_token, fingerprint_token};
use geonexus_core::telegram::{
    polling::{start_polling_loop, PollingExit},
    sender::{escape_markdown_v2, get_me, sanitize_incoming_text, send_chat_action, send_message},
    TelegramConfig, Update,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelegramStatus {
    pub is_running: bool,
    pub bot_name: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TelegramConfigStorage {
    bot_token_encrypted: String,
    allowed_users: Vec<String>,
    response_mode: String,
}

pub struct TelegramState {
    pub polling_task: Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
    pub cancel_flag: Arc<AtomicBool>,
    pub config: Mutex<Option<TelegramConfig>>,
    pub is_running: Arc<Mutex<bool>>,
    pub last_error: Mutex<Option<String>>,
}

impl Default for TelegramState {
    fn default() -> Self {
        Self {
            polling_task: Mutex::new(None),
            cancel_flag: Arc::new(AtomicBool::new(false)),
            config: Mutex::new(None),
            is_running: Arc::new(Mutex::new(false)),
            last_error: Mutex::new(None),
        }
    }
}

async fn load_config_internal(state: &AppState) -> Result<TelegramConfig, String> {
    let row: Option<(String,)> = sqlx::query_as("SELECT value FROM app_settings WHERE key = ?1")
        .bind("telegram_config")
        .fetch_optional(&state.db)
        .await
        .map_err(|_| "Error de base de datos".to_string())?;

    let (value,) = row.ok_or_else(|| "No hay configuración de Telegram".to_string())?;
    let storage: TelegramConfigStorage =
        serde_json::from_str(&value).map_err(|_| "Configuración corrupta".to_string())?;

    let bot_token = decrypt_token(&storage.bot_token_encrypted)
        .map_err(|_| "Error al descifrar configuración".to_string())?;

    Ok(TelegramConfig {
        bot_token,
        allowed_users: storage.allowed_users,
        response_mode: storage.response_mode,
    })
}

#[tauri::command]
pub async fn telegram_save_config(
    state: State<'_, AppState>,
    token: String,
    allowed_users: Vec<String>,
    response_mode: String,
) -> Result<(), String> {
    if allowed_users.is_empty() {
        return Err(
            "Debes especificar al menos un usuario permitido (ID numérico de Telegram)"
                .to_string(),
        );
    }

    for user in &allowed_users {
        let normalized = user.trim_start_matches('@');
        if normalized.parse::<i64>().is_err() {
            return Err(format!(
                "'{}' no es un ID numérico válido. Usa el ID numérico de Telegram.",
                user
            ));
        }
    }

    let normalized_users: Vec<String> = allowed_users
        .iter()
        .map(|u| u.trim_start_matches('@').trim().to_string())
        .collect();

    let fp = fingerprint_token(&token);
    tracing::info!("[telegram] Saving config (fingerprint: {})", fp);

    let encrypted = encrypt_token(&token).map_err(|e| {
        tracing::error!("Failed to encrypt token: {}", e);
        "Error interno al guardar".to_string()
    })?;

    let storage = TelegramConfigStorage {
        bot_token_encrypted: encrypted,
        allowed_users: normalized_users,
        response_mode,
    };

    let config_json =
        serde_json::to_string(&storage).map_err(|_| "Error interno de serialización".to_string())?;

    sqlx::query(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind("telegram_config")
    .bind(&config_json)
    .execute(&state.db)
    .await
    .map_err(|_| "Error al guardar en base de datos".to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn telegram_load_config(
    state: State<'_, AppState>,
) -> Result<Option<serde_json::Value>, String> {
    match load_config_internal(&state).await {
        Ok(config) => Ok(Some(serde_json::json!({
            "has_config": true,
            "allowed_users": config.allowed_users,
            "response_mode": config.response_mode,
            "bot_configured": true,
        }))),
        Err(_) => Ok(Some(serde_json::json!({
            "has_config": false,
        }))),
    }
}

#[tauri::command]
pub async fn telegram_test_connection(
    state: State<'_, AppState>,
    token: Option<String>,
) -> Result<serde_json::Value, String> {
    let bot_token = match token {
        Some(t) if !t.trim().is_empty() => t,
        _ => load_config_internal(&state).await?.bot_token,
    };

    let fp = fingerprint_token(&bot_token);
    tracing::info!("[telegram] Testing connection (fingerprint: {})", fp);

    let url = format!("https://api.telegram.org/bot{}/getMe", bot_token);

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|_| "Error interno de red".to_string())?;

    let resp = client.get(&url).send().await.map_err(|e| {
        tracing::error!("telegram_test_connection network error: {}", e);
        "No se pudo conectar a Telegram API".to_string()
    })?;

    let status = resp.status();
    if !status.is_success() {
        return Err(format!("Telegram API respondió con error {}", status.as_u16()));
    }

    let body: serde_json::Value = resp
        .json()
        .await
        .map_err(|_| "Respuesta inválida de Telegram API".to_string())?;

    Ok(serde_json::json!({
        "ok": true,
        "bot_username": body["result"]["username"],
        "bot_id": body["result"]["id"],
        "bot_name": body["result"]["first_name"],
    }))
}

#[tauri::command]
pub async fn telegram_start_polling(
    app: AppHandle,
    state: State<'_, AppState>,
    tg_state: State<'_, TelegramState>,
) -> Result<String, String> {
    let config = load_config_internal(&state).await?;

    let fp = fingerprint_token(&config.bot_token);
    tracing::info!("[telegram] Starting polling (fingerprint: {})", fp);

    let client = Client::new();
    let bot_info = get_me(&client, &config.bot_token).await?;
    let bot_name = bot_info
        .username
        .clone()
        .unwrap_or_else(|| bot_info.first_name.clone());

    {
        let mut tg_config = tg_state.config.lock().unwrap();
        *tg_config = Some(config.clone());
        let mut last_error = tg_state.last_error.lock().unwrap();
        *last_error = None;
    }

    let cancel_flag = tg_state.cancel_flag.clone();
    cancel_flag.store(false, Ordering::SeqCst);

    let token_clone = config.bot_token.clone();
    let app_for_handler = app.clone();
    let app_for_errors = app.clone();
    let allowed_users = config.allowed_users.clone();
    let db = state.db.clone();
    let is_running_flag = tg_state.is_running.clone();

    let handle = tauri::async_runtime::spawn(async move {
        let exit = start_polling_loop(
            token_clone,
            move |update: Update| {
                let app = app_for_handler.clone();
                let allowed_users = allowed_users.clone();
                let db = db.clone();
                async move {
                    handle_update(update, app, &allowed_users, &db).await;
                }
            },
            cancel_flag.clone(),
        )
        .await;

        match exit {
            PollingExit::Cancelled => {
                tracing::info!("[telegram] Polling stopped");
            }
            PollingExit::Fatal(err) => {
                tracing::error!("[telegram] Polling fatal error: {}", err.message());
                let _ = app_for_errors.emit(
                    "telegram:error",
                    serde_json::json!({
                        "kind": err.kind(),
                        "message": err.user_message(),
                    }),
                );
            }
        }

        let mut is_running = is_running_flag.lock().unwrap();
        *is_running = false;
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
pub async fn telegram_stop_polling(
    tg_state: State<'_, TelegramState>,
) -> Result<(), String> {
    tg_state.cancel_flag.store(true, Ordering::SeqCst);

    let handle = {
        let mut task = tg_state.polling_task.lock().unwrap();
        task.take()
    };
    if let Some(handle) = handle {
        let _ = tokio::time::timeout(std::time::Duration::from_secs(5), handle).await;
    }

    let mut is_running = tg_state.is_running.lock().unwrap();
    *is_running = false;

    tracing::info!("[telegram] Polling stopped");
    Ok(())
}

#[tauri::command]
pub async fn telegram_get_status(
    state: State<'_, AppState>,
    tg_state: State<'_, TelegramState>,
) -> Result<TelegramStatus, String> {
    let is_running = {
        let running = tg_state.is_running.lock().unwrap();
        *running
    };

    let last_error = {
        let err = tg_state.last_error.lock().unwrap();
        err.clone()
    };

    let config = load_config_internal(&state).await.ok();
    let (bot_name, error) = if let Some(ref cfg) = config {
        let client = Client::new();
        match get_me(&client, &cfg.bot_token).await {
            Ok(me) => (Some(me.username.unwrap_or(me.first_name)), last_error),
            Err(e) => (None, Some(e)),
        }
    } else {
        (None, Some("No config".into()))
    };

    Ok(TelegramStatus {
        is_running,
        bot_name,
        error,
    })
}

#[tauri::command]
pub async fn telegram_send_chat_action(
    chat_id: i64,
    action: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config = load_config_internal(&state).await?;
    let client = Client::new();
    send_chat_action(&client, &config.bot_token, chat_id, &action).await?;
    Ok(())
}

#[tauri::command]
pub async fn telegram_send_response(
    chat_id: i64,
    text: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config = load_config_internal(&state).await?;
    let escaped = escape_markdown_v2(&text);
    let client = Client::new();
    send_message(
        &client,
        &config.bot_token,
        chat_id,
        &escaped,
        Some("MarkdownV2"),
    )
    .await?;
    Ok(())
}

async fn handle_update(
    update: Update,
    app: AppHandle,
    allowed_users: &[String],
    db: &sqlx::SqlitePool,
) {
    let Some(message) = update.message else { return };

    if message.chat.chat_type != "private" {
        return;
    }

    let user_id = message.from.id.to_string();
    let is_allowed = allowed_users.contains(&user_id);

    if !is_allowed {
        let _ = log_audit_in_db(db, message.chat.id, message.from.id, "rejected").await;
        return;
    }

    let text = message.text.unwrap_or_default();
    let text = sanitize_incoming_text(&text);

    if text.is_empty() {
        return;
    }

    let _ = log_audit_in_db(db, message.chat.id, message.from.id, "processed").await;

    let payload = serde_json::json!({
        "chat_id": message.chat.id,
        "user_id": message.from.id,
        "username": message.from.username,
        "text": text,
    });

    let _ = app.emit("telegram:message", payload);
}

async fn log_audit_in_db(
    db: &sqlx::SqlitePool,
    chat_id: i64,
    telegram_user_id: i64,
    action: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO telegram_audit_log (chat_id, telegram_user_id, action, created_at)
         VALUES (?1, ?2, ?3, datetime('now'))",
    )
    .bind(chat_id)
    .bind(telegram_user_id)
    .bind(action)
    .execute(db)
    .await?;
    Ok(())
}
