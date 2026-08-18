use super::{GetUpdatesResponse, Update, sender};
use reqwest::Client;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

const RATE_LIMIT_MAX_TOKENS: f64 = 10.0;
const RATE_LIMIT_REFILL_RATE: f64 = 10.0 / 60.0;

#[derive(Debug)]
pub enum PollingError {
    InvalidToken(String),
    ConflictingPoller(String),
    NetworkError(String),
    Unknown(String),
}

impl PollingError {
    pub fn from_status(status: u16, _body: &str) -> Self {
        match status {
            401 => PollingError::InvalidToken(
                "Token de Telegram inválido o revocado".into(),
            ),
            409 => PollingError::ConflictingPoller(
                "Otro proceso usa este bot token".into(),
            ),
            _ => PollingError::Unknown(format!("Telegram API error HTTP {}", status)),
        }
    }

    pub fn kind(&self) -> &str {
        match self {
            PollingError::InvalidToken(_) => "invalid_token",
            PollingError::ConflictingPoller(_) => "conflict",
            PollingError::NetworkError(_) => "network",
            PollingError::Unknown(_) => "unknown",
        }
    }

    pub fn message(&self) -> &str {
        match self {
            PollingError::InvalidToken(m) => m,
            PollingError::ConflictingPoller(m) => m,
            PollingError::NetworkError(m) => m,
            PollingError::Unknown(m) => m,
        }
    }

    pub fn user_message(&self) -> &str {
        match self {
            PollingError::InvalidToken(_) => {
                "El token de Telegram es inválido o fue revocado. Actualiza la configuración."
            }
            PollingError::ConflictingPoller(_) => {
                "Otro proceso está usando este bot. Detén el proceso duplicado."
            }
            PollingError::NetworkError(_) => {
                "Error de red al contactar Telegram. Verifica tu conexión."
            }
            PollingError::Unknown(_) => {
                "Error inesperado en la conexión con Telegram."
            }
        }
    }
}

struct TokenBucket {
    tokens: f64,
    last_refill: Instant,
}

impl TokenBucket {
    fn new() -> Self {
        Self {
            tokens: RATE_LIMIT_MAX_TOKENS,
            last_refill: Instant::now(),
        }
    }

    fn try_consume(&mut self) -> bool {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        self.tokens = (self.tokens + elapsed * RATE_LIMIT_REFILL_RATE)
            .min(RATE_LIMIT_MAX_TOKENS);
        self.last_refill = now;

        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true
        } else {
            false
        }
    }
}

struct BackoffState {
    attempt: u32,
}

impl BackoffState {
    fn new() -> Self {
        Self { attempt: 0 }
    }

    fn reset(&mut self) {
        self.attempt = 0;
    }

    fn next_delay(&mut self) -> Duration {
        self.attempt += 1;
        let base_secs = 30u64.saturating_mul(2u64.saturating_pow(self.attempt.min(4)));
        let capped = base_secs.min(600);
        Duration::from_secs(capped)
    }
}

pub async fn get_updates(
    client: &Client,
    token: &str,
    offset: i64,
    timeout: u64,
) -> Result<Vec<Update>, PollingError> {
    let url = format!("https://api.telegram.org/bot{}/getUpdates", token);

    let response = client
        .get(&url)
        .query(&[("offset", offset), ("timeout", timeout as i64)])
        .send()
        .await
        .map_err(|e| {
            PollingError::NetworkError(if e.is_timeout() {
                "timeout".into()
            } else if e.is_connect() {
                "error de conexión".into()
            } else {
                "error de red".into()
            })
        })?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        let safe_body = body.chars().take(100).collect::<String>();
        return Err(PollingError::from_status(status.as_u16(), &safe_body));
    }

    let updates_response: GetUpdatesResponse = response
        .json()
        .await
        .map_err(|_| PollingError::NetworkError("Respuesta JSON inválida".into()))?;

    if !updates_response.ok {
        return Err(PollingError::Unknown(
            "Respuesta no ok de Telegram API".into(),
        ));
    }

    Ok(updates_response.result)
}

pub enum PollingExit {
    Cancelled,
    Fatal(PollingError),
}

pub async fn start_polling_loop<F, Fut>(
    token: String,
    mut handler: F,
    cancel_flag: Arc<AtomicBool>,
) -> PollingExit
where
    F: FnMut(Update) -> Fut + Send + 'static,
    Fut: std::future::Future<Output = ()> + Send + 'static,
{
    let client = Client::new();
    
    // Register slash commands first!
    if let Err(e) = sender::register_slash_commands(&client, &token).await {
        tracing::warn!("[telegram] No se pudieron registrar los comandos slash: {}", e);
    }
    
    let mut offset: i64 = 0;
    let mut backoff = BackoffState::new();
    let rate_limiter = RateLimiter::new();

    tracing::info!("[telegram] Polling loop started");

    loop {
        if cancel_flag.load(Ordering::SeqCst) {
            tracing::info!("[telegram] Polling cancelled gracefully");
            return PollingExit::Cancelled;
        }

        match get_updates(&client, &token, offset, 30).await {
            Ok(updates) => {
                backoff.reset();
                for update in updates {
                    offset = update.update_id + 1;

                    if let Some(ref msg) = update.message {
                        if !rate_limiter.check(msg.chat.id).await {
                            tracing::warn!(
                                "[telegram] Rate limit exceeded for chat {}",
                                msg.chat.id
                            );
                            continue;
                        }
                    }

                    handler(update).await;
                }
            }
            Err(err @ PollingError::InvalidToken(_)) | Err(err @ PollingError::ConflictingPoller(_)) => {
                tracing::error!("[telegram] {}", err.message());
                return PollingExit::Fatal(err);
            }
            Err(PollingError::NetworkError(msg)) | Err(PollingError::Unknown(msg)) => {
                let delay = backoff.next_delay();
                tracing::warn!("[telegram] Error: {}. Reintentando en {:?}", msg, delay);

                let slept = sleep_with_cancel(delay, &cancel_flag).await;
                if !slept {
                    tracing::info!("[telegram] Polling cancelled during backoff");
                    return PollingExit::Cancelled;
                }
            }
        }
    }
}

async fn sleep_with_cancel(delay: Duration, cancel: &AtomicBool) -> bool {
    let start = Instant::now();
    while start.elapsed() < delay {
        if cancel.load(Ordering::SeqCst) {
            return false;
        }
        tokio::time::sleep(Duration::from_millis(200)).await;
    }
    !cancel.load(Ordering::SeqCst)
}

pub struct RateLimiter {
    buckets: Arc<Mutex<HashMap<i64, TokenBucket>>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            buckets: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn check(&self, chat_id: i64) -> bool {
        let mut buckets = self.buckets.lock().await;
        let bucket = buckets.entry(chat_id).or_insert_with(TokenBucket::new);
        bucket.try_consume()
    }
}
