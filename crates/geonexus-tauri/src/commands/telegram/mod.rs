pub mod config;
pub mod pairing;
pub mod polling;

pub use config::{telegram_load_config, telegram_save_config, telegram_send_chat_action, telegram_send_response, telegram_test_connection};
pub use pairing::telegram_generate_pairing_code;
pub use polling::{telegram_get_status, telegram_start_polling, telegram_stop_polling};

use serde::{Deserialize, Serialize};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelegramStatus {
    pub is_running: bool,
    pub bot_name: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct TelegramConfigStorage {
    pub bot_token_encrypted: String,
    pub allowed_users: Vec<String>,
    pub response_mode: String,
}

pub struct TelegramState {
    pub polling_task: Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
    pub cancel_flag: Arc<AtomicBool>,
    pub is_running: Arc<Mutex<bool>>,
    pub last_error: Mutex<Option<String>>,
}

impl Default for TelegramState {
    fn default() -> Self {
        Self {
            polling_task: Mutex::new(None),
            cancel_flag: Arc::new(AtomicBool::new(false)),
            is_running: Arc::new(Mutex::new(false)),
            last_error: Mutex::new(None),
        }
    }
}
