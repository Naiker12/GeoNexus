use crate::AppState;
use geonexus_core::crypto::fingerprint_token;
use geonexus_core::telegram::{
    polling::{start_polling_loop, PollingExit},
    sender::{get_me, send_message},
    Update,
};
use reqwest::Client;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter, Manager, State};

use super::TelegramState;

use crate::commands::telegram::config::load_config_internal;
use crate::commands::telegram::pairing::{self, PairingState};

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
        let mut last_error = tg_state.last_error.lock().unwrap();
        *last_error = None;
    }

    let cancel_flag = tg_state.cancel_flag.clone();
    cancel_flag.store(false, Ordering::SeqCst);

    let token_clone = config.bot_token.clone();
    let token_for_handler = config.bot_token.clone();
    let app_for_handler = app.clone();
    let app_for_errors = app.clone();
    let db = state.db.clone();
    let is_running_flag = tg_state.is_running.clone();
    let pairing_for_handler = app.state::<PairingState>().inner().clone();

    let handle = tauri::async_runtime::spawn(async move {
        let exit = start_polling_loop(
            token_clone,
            move |update: Update| {
                let app = app_for_handler.clone();
                let db = db.clone();
                let token = token_for_handler.clone();
                let pairing = pairing_for_handler.clone();
                async move {
                    handle_update(update, &token, app, &db, &pairing).await;
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
) -> Result<super::TelegramStatus, String> {
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

    Ok(super::TelegramStatus {
        is_running,
        bot_name,
        error,
    })
}

async fn load_allowed_users(db: &sqlx::SqlitePool) -> Option<Vec<String>> {
    let row: Option<(String,)> = sqlx::query_as("SELECT value FROM app_settings WHERE key = ?1")
        .bind("telegram_config")
        .fetch_optional(db)
        .await
        .ok()?;
    let (value,) = row?;
    let storage: crate::commands::telegram::TelegramConfigStorage =
        serde_json::from_str(&value).ok()?;
    Some(storage.allowed_users)
}

const COMMANDS_HELP: &str = "\
Comandos disponibles:
/start — Iniciar el bot
/help — Mostrar esta ayuda
/status — Estado del bot
/chat — Enviar mensaje al asistente";

async fn handle_update(
    update: Update,
    token: &str,
    app: AppHandle,
    db: &sqlx::SqlitePool,
    pairing: &PairingState,
) {
    let Some(message) = update.message else { return };

    if message.chat.chat_type != "private" {
        return;
    }

    let allowed_users = load_allowed_users(db).await;
    let user_id = message.from.id.to_string();
    let is_allowed = allowed_users.as_ref().map_or(false, |u| u.contains(&user_id));

    let text = message.text.clone().unwrap_or_default();
    let text = geonexus_core::telegram::sender::sanitize_incoming_text(&text);

    let (content_type, content_summary, file_id) = classify_content(&message);

    if text.is_empty() && content_type == "text" {
        let msg = "Solo puedo procesar mensajes de texto, voz, imágenes y documentos.";
        if let Err(e) = send_message(&Client::new(), token, message.chat.id, msg, None).await {
            tracing::warn!("[telegram] Error sending unsupported type reply: {}", e);
        }
        return;
    }

    if let Some(code) = text.strip_prefix("/start ") {
        let code = code.trim();
        if !code.is_empty() && pairing::verify_and_consume(pairing, code) {
            let _ = pairing::add_user_to_allowed(db, message.from.id).await;
            let _ = log_audit_in_db(db, message.chat.id, message.from.id, "paired").await;
            if let Err(e) = send_message(
                &Client::new(),
                token,
                message.chat.id,
                "¡Vinculación exitosa! Ya puedes usar este bot.",
                None,
            ).await {
                tracing::warn!("[telegram] Error sending pairing success: {}", e);
            }
            return;
        }
    }

    if let Some(response) = handle_slash_command(&text) {
        if let Err(e) = send_message(&Client::new(), token, message.chat.id, response, None).await {
            tracing::warn!("[telegram] Error sending slash command response: {}", e);
        }
        return;
    }

    if !is_allowed {
        let _ = log_audit_in_db(db, message.chat.id, message.from.id, "rejected").await;
        return;
    }

    let _ = log_audit_in_db(db, message.chat.id, message.from.id, "processed").await;

    let payload = serde_json::json!({
        "chat_id": message.chat.id,
        "user_id": message.from.id,
        "username": message.from.username,
        "text": text,
        "content_type": content_type,
        "content_summary": content_summary,
        "file_id": file_id,
        "caption": message.caption,
    });

    let _ = app.emit("telegram:message", payload);
}

fn classify_content(msg: &geonexus_core::telegram::Message) -> (&'static str, String, Option<String>) {
    if msg.voice.is_some() {
        let duration = msg.voice.as_ref().unwrap().duration;
        let mins = duration / 60;
        let secs = duration % 60;
        (
            "voice",
            format!("🎤 Mensaje de voz ({}:{:02})", mins, secs),
            Some(msg.voice.as_ref().unwrap().file_id.clone()),
        )
    } else if let Some(ref photos) = msg.photo {
        let count = photos.len();
        let caption = msg.caption.as_deref().unwrap_or("sin descripción");
        (
            "photo",
            format!("📷 {} foto(s) — {}", count, caption),
            photos.last().map(|p| p.file_id.clone()),
        )
    } else if let Some(ref doc) = msg.document {
        let name = doc.file_name.as_deref().unwrap_or("documento");
        let mime = doc.mime_type.as_deref().unwrap_or("desconocido");
        (
            "document",
            format!("📄 {} ({})", name, mime),
            Some(doc.file_id.clone()),
        )
    } else if msg.sticker.is_some() {
        let emoji = msg.sticker.as_ref().unwrap().emoji.as_deref().unwrap_or("✨");
        (
            "sticker",
            format!("🎨 Sticker {}", emoji),
            Some(msg.sticker.as_ref().unwrap().file_id.clone()),
        )
    } else if let Some(ref audio) = msg.audio {
        let title = audio.title.as_deref().unwrap_or("audio");
        let dur = audio.duration;
        let mins = dur / 60;
        let secs = dur % 60;
        (
            "audio",
            format!("🎵 {} ({}:{:02})", title, mins, secs),
            Some(audio.file_id.clone()),
        )
    } else if let Some(ref video) = msg.video {
        let dur = video.duration;
        let mins = dur / 60;
        let secs = dur % 60;
        (
            "video",
            format!("🎬 Video ({}:{:02}, {}×{})", mins, secs, video.width, video.height),
            Some(video.file_id.clone()),
        )
    } else {
        ("text", String::new(), None)
    }
}

fn handle_slash_command(text: &str) -> Option<&'static str> {
    if !text.starts_with('/') {
        return None;
    }
    let cmd = text.split_whitespace().next().unwrap_or("").to_lowercase();
    match cmd.as_str() {
        "/start" => Some("¡Hola! Soy GeoAgents, tu asistente GeoNexus. Escribe /help para ver los comandos disponibles."),
        "/help" => Some(COMMANDS_HELP),
        "/status" => Some("Bot activo. Conectado a GeoNexus."),
        _ => None,
    }
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
