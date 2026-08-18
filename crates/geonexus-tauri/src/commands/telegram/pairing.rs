use rand::Rng;
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairingCodeInfo {
    pub code: String,
    pub expires_in_secs: u64,
}

#[derive(Clone)]
struct PendingPairing {
    created_at: Instant,
}

#[derive(Clone)]
pub struct PairingState {
    pending: Arc<Mutex<HashMap<String, PendingPairing>>>,
}

impl Default for PairingState {
    fn default() -> Self {
        Self {
            pending: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

const CODE_EXPIRY_SECS: u64 = 120;

fn generate_code() -> String {
    let mut rng = rand::thread_rng();
    let code: String = (0..6)
        .map(|_| rng.sample(rand::distributions::Alphanumeric) as char)
        .collect();
    code.to_uppercase()
}

pub fn verify_and_consume(pairing: &PairingState, code: &str) -> bool {
    let mut pending = pairing.pending.lock().unwrap();
    let upper = code.to_uppercase();
    if let Some(entry) = pending.remove(&upper) {
        entry.created_at.elapsed() < Duration::from_secs(CODE_EXPIRY_SECS)
    } else {
        false
    }
}

pub async fn add_user_to_allowed(db: &sqlx::SqlitePool, telegram_user_id: i64) -> Result<(), String> {
    let row: Option<(String,)> = sqlx::query_as("SELECT value FROM app_settings WHERE key = ?1")
        .bind("telegram_config")
        .fetch_optional(db)
        .await
        .map_err(|_| "Error de base de datos".to_string())?;

    let value = row.ok_or_else(|| "No hay configuración de Telegram".to_string())?;
    let mut storage: crate::commands::telegram::TelegramConfigStorage =
        serde_json::from_str(&value.0).map_err(|_| "Configuración corrupta".to_string())?;

    let user_id_str = telegram_user_id.to_string();
    if !storage.allowed_users.contains(&user_id_str) {
        storage.allowed_users.push(user_id_str);
    }

    let config_json = serde_json::to_string(&storage)
        .map_err(|_| "Error de serialización".to_string())?;

    sqlx::query(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind("telegram_config")
    .bind(&config_json)
    .execute(db)
    .await
    .map_err(|_| "Error al guardar en base de datos".to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn telegram_generate_pairing_code(
    pairing_state: State<'_, PairingState>,
) -> Result<PairingCodeInfo, String> {
    let code = generate_code();

    {
        let mut pending = pairing_state.pending.lock().unwrap();
        pending.insert(
            code.clone(),
            PendingPairing {
                created_at: Instant::now(),
            },
        );
    }

    Ok(PairingCodeInfo {
        code,
        expires_in_secs: CODE_EXPIRY_SECS,
    })
}

pub fn cleanup_expired(pairing: &PairingState) {
    if let Ok(mut pending) = pairing.pending.lock() {
        pending.retain(|_, entry| entry.created_at.elapsed() < Duration::from_secs(CODE_EXPIRY_SECS));
    }
}
