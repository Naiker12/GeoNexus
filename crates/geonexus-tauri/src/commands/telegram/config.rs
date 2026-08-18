use crate::AppState;
use geonexus_core::crypto::{decrypt_token, encrypt_token, fingerprint_token};
use geonexus_core::security::redact_secrets;
use geonexus_core::telegram::TelegramConfig;
use reqwest::Client;
use tauri::State;

use super::TelegramConfigStorage;

pub(crate) async fn load_config_internal(state: &AppState) -> Result<TelegramConfig, String> {
    let row: Option<(String,)> = sqlx::query_as("SELECT value FROM app_settings WHERE key = ?1")
        .bind("telegram_config")
        .fetch_optional(&state.db)
        .await
        .map_err(|_| "Error de base de datos".to_string())?;

    let (value,) = row.ok_or_else(|| "No hay configuración de Telegram".to_string())?;

    tracing::debug!("[telegram] Raw config: {}", redact_secrets(&value));

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

    tracing::debug!("[telegram] Config JSON: {}", redact_secrets(&config_json));

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
pub async fn telegram_send_chat_action(
    chat_id: i64,
    action: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config = load_config_internal(&state).await?;
    let client = Client::new();
    geonexus_core::telegram::sender::send_chat_action(&client, &config.bot_token, chat_id, &action).await?;
    Ok(())
}

#[tauri::command]
pub async fn telegram_send_response(
    chat_id: i64,
    text: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config = load_config_internal(&state).await?;
    let escaped = geonexus_core::telegram::sender::escape_markdown_v2(&text);
    let client = Client::new();
    let result = geonexus_core::telegram::sender::send_message(
        &client,
        &config.bot_token,
        chat_id,
        &escaped,
        Some("MarkdownV2"),
    )
    .await;

    match result {
        Ok(()) => Ok(()),
        Err(md_err) => {
            tracing::warn!("[telegram] MarkdownV2 send failed, falling back to plain text: {}", md_err);
            geonexus_core::telegram::sender::send_message(
                &client,
                &config.bot_token,
                chat_id,
                &text,
                None,
            )
            .await
        }
    }
}
