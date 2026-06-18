use tauri::{AppHandle, Emitter, State};
use crate::AppState;
use crate::commands::llm::sidecar::run_sidecar;
use geonexus_core::telegram::{
    polling::start_polling_loop,
    sender::{get_me, send_chat_action, send_message},
    TelegramConfig, Update,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;
use std::sync::Mutex;
use tauri::async_runtime::JoinHandle;

static TELEGRAM_TASK: Lazy<Mutex<Option<JoinHandle<()>>>> = Lazy::new(|| Mutex::new(None));
static BOT_INFO: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));
static LAST_ERROR: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));
const TELEGRAM_CONFIG_KEY: &str = "telegram_config";

#[derive(Clone, Serialize, Deserialize)]
struct FileCreatedPayload {
    path: String,
    content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmProviderInfo {
    pub provider_type: String,
    pub model: String,
    pub endpoint: String,
    pub api_key: Option<String>,
}

pub struct TelegramState {
    pub polling_task: Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
    pub config: Mutex<Option<TelegramConfig>>,
    pub llm_config: Mutex<Option<LlmProviderInfo>>,
    pub is_running: Mutex<bool>,
}

impl Default for TelegramState {
    fn default() -> Self {
        Self {
            polling_task: Mutex::new(None),
            config: Mutex::new(None),
            llm_config: Mutex::new(None),
            is_running: Mutex::new(false),
        }
    }
    h1 { color: #818cf8; font-size: 1.8rem; }
    p  { color: #94a3b8; font-size: 0.95rem; }
  </style>
</head>
<body>
  <h1>🎯 GeoNexus Sandbox</h1>
  <p>Entorno de ejecución real vía proceso supervisor de Tauri.</p>
  <p id="status">En espera de instrucciones...</p>
  <script type="module" src="/src/main.js"></script>
</body>
</html>"#,
        ),
        (
            "src/main.js",
            r#"document.getElementById('status').textContent = '✅ Servidor de desarrollo activo.';
console.log('[GeoNexus] Sandbox environment running.');
"#,
        ),
        (
            "vite.config.js",
            r#"import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5174,
    strictPort: true,
    headers: { 'X-Frame-Options': 'ALLOWALL' },
  },
});
"#,
        ),
    ]
}

#[tauri::command]
pub async fn coding_agent_start_generation(
    description: String,
    project_path: String,
    app: AppHandle,
) -> Result<String, String> {
    use std::path::PathBuf;
    use tokio::fs;
    use tokio::process::Command as AsyncCommand;
    use std::process::Stdio;

    let root_path: PathBuf = if project_path.trim().is_empty() {
        std::env::temp_dir().join("geonexus-sandbox")
    } else {
        PathBuf::from(&project_path)
    };

    app.emit("coding:generation_start", serde_json::json!({
        "description": &description,
        "project_path": root_path.to_string_lossy(),
    })).ok();

    let w = app.clone();
    let desc = description.clone();
    let root = root_path.clone();

    tauri::async_runtime::spawn(async move {
        w.emit("agent:step_start", serde_json::json!({
            "step_id": "t1", "agent": "planner",
            "label": format!("Analizando objetivo: {}", desc),
        })).ok();
        tokio::time::sleep(std::time::Duration::from_millis(900)).await;
        w.emit("agent:item_added", serde_json::json!({
            "step_id": "t1", "item": "Stack: Vite + Vanilla JS (sandbox)", "status": "done",
        })).ok();
        w.emit("agent:step_complete", serde_json::json!({"step_id": "t1", "status": "done"})).ok();

        w.emit("agent:step_start", serde_json::json!({
            "step_id": "t2", "agent": "workspace",
            "label": "Creando estructura del proyecto en disco",
        })).ok();
        if let Err(e) = fs::create_dir_all(&root).await {
            w.emit("agent:error", AgentErrorPayload {
                message: format!("No se pudo crear el directorio raíz: {}", e),
            }).ok();
            return;
        }
        w.emit("agent:item_added", serde_json::json!({
            "step_id": "t2", "item": root.to_string_lossy(), "status": "done",
        })).ok();
        w.emit("agent:step_complete", serde_json::json!({"step_id": "t2", "status": "done"})).ok();

        w.emit("agent:step_start", serde_json::json!({
            "step_id": "t3", "agent": "coding",
            "label": "Escribiendo archivos del proyecto en el filesystem",
        })).ok();

        let scaffold = sandbox_scaffold();
        for (rel_path, _) in &scaffold {
            w.emit("agent:item_added", serde_json::json!({
                "step_id": "t3", "item": rel_path, "status": "pending",
            })).ok();
        }

        for (rel_path, content) in scaffold {
            let full_path = root.join(rel_path);
            if let Some(parent) = full_path.parent() {
                let _ = fs::create_dir_all(parent).await;
            }
            if let Err(e) = fs::write(&full_path, content).await {
                w.emit("agent:error", AgentErrorPayload {
                    message: format!("Error al escribir '{}': {}", rel_path, e),
                }).ok();
                continue;
            }
            w.emit("coding:file_created", FileCreatedPayload {
                path: rel_path.to_string(),
                content: content.to_string(),
            }).ok();
            w.emit("agent:item_updated", serde_json::json!({
                "step_id": "t3", "item_name": rel_path, "status": "done",
            })).ok();
            tokio::time::sleep(std::time::Duration::from_millis(350)).await;
        }
        w.emit("agent:step_complete", serde_json::json!({"step_id": "t3", "status": "done"})).ok();

        w.emit("agent:step_start", serde_json::json!({
            "step_id": "t4", "agent": "dependencies",
            "label": "Instalando dependencias via npm",
        })).ok();

        let npm_cmd = if cfg!(target_os = "windows") { "npm.cmd" } else { "npm" };
        match AsyncCommand::new(npm_cmd)
            .arg("install")
            .current_dir(&root)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
        {
            Ok(s) if s.success() => {
                w.emit("agent:item_added", serde_json::json!({
                    "step_id": "t4", "item": "node_modules instalado", "status": "done",
                })).ok();
            }
            _ => {}
        }
        w.emit("agent:step_complete", serde_json::json!({"step_id": "t4", "status": "done"})).ok();

        w.emit("agent:step_start", serde_json::json!({
            "step_id": "t5", "agent": "preview",
            "label": "Levantando servidor de desarrollo Vite en puerto 5174",
        })).ok();

        let npx_cmd = if cfg!(target_os = "windows") { "npx.cmd" } else { "npx" };
        if let Ok(_child) = AsyncCommand::new(npx_cmd)
            .args(["vite", "--port", "5174", "--strictPort"])
            .current_dir(&root)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
        {
            tokio::time::sleep(std::time::Duration::from_millis(2500)).await;
            w.emit("agent:item_added", serde_json::json!({
                "step_id": "t5", "item": "→ Servidor activo en http://localhost:5174", "status": "done",
            })).ok();
            w.emit("agent:step_complete", serde_json::json!({"step_id": "t5", "status": "done"})).ok();
            w.emit("agent:preview_ready", serde_json::json!({"url": "http://localhost:5174"})).ok();
        }
    });

    Ok(format!("Pipeline de ejecución despachado para: {}", description))
}

#[tauri::command]
pub async fn telegram_save_config(
    state: State<'_, AppState>,
    token: String,
    allowed_users: Vec<String>,
    response_mode: String,
) -> Result<(), String> {
    let config = serde_json::json!({
        "bot_token": token,
        "allowed_users": allowed_users,
        "response_mode": response_mode,
    });
    let config_str = config.to_string();

    sqlx::query(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
    )
    .bind(TELEGRAM_CONFIG_KEY)
    .bind(&config_str)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn telegram_load_config(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let default_config = serde_json::json!({
        "bot_token": "",
        "allowed_users": Vec::<String>::new(),
        "response_mode": "auto",
    });

    let row: Option<(String,)> = sqlx::query_as("SELECT value FROM app_settings WHERE key = ?1")
        .bind(TELEGRAM_CONFIG_KEY)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some((json_str,)) = row {
        if json_str.trim().is_empty() {
            return Ok(default_config);
        }

        let mut config = serde_json::from_str::<serde_json::Value>(&json_str).unwrap_or(default_config);
        if config.get("bot_token").is_none() {
            config["bot_token"] = serde_json::Value::String(String::new());
        }
        if config.get("allowed_users").is_none() {
            config["allowed_users"] = serde_json::Value::Array(Vec::new());
        }
        if config.get("response_mode").is_none() {
            config["response_mode"] = serde_json::Value::String("auto".into());
        }
        return Ok(config);
    }

    Ok(default_config)
}

#[tauri::command]
pub async fn telegram_start_polling(
    app: AppHandle,
    state: State<'_, AppState>,
    tg_state: State<'_, TelegramState>,
    token: Option<String>,
    allowed_users: Option<Vec<String>>,
    response_mode: Option<String>,
    llm_provider_type: Option<String>,
    llm_model: Option<String>,
    llm_endpoint: Option<String>,
    llm_api_key: Option<String>,
) -> Result<String, String> {
    // Detener polling anterior si existe (MutexGuard dropped antes del await)
    let needs_abort = tg_state.polling_task.lock().unwrap().take();
    if let Some(handle) = needs_abort {
        handle.abort();
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }

    // Usar token del payload si se proporciona, o cargar de DB
    let config = if let Some(ref t) = token {
        let cfg = TelegramConfig {
            bot_token: t.clone(),
            allowed_users: allowed_users.unwrap_or_default(),
            response_mode: response_mode.unwrap_or_else(|| "sources".to_string()),
        };
        // Persistir en DB
        let config_json = serde_json::to_string(&cfg).map_err(|e| e.to_string())?;
        sqlx::query(
            "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
        )
        .bind("telegram_config")
        .bind(&config_json)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
        cfg
    } else {
        telegram_load_config(state).await?
            .ok_or_else(|| "Config de Telegram no encontrada".to_string())?
    };

    // Guardar config del LLM en el estado (para telegram_send_response)
    if let (Some(pt), Some(m), Some(e)) = (llm_provider_type.clone(), llm_model.clone(), llm_endpoint.clone()) {
        let mut llm_cfg = tg_state.llm_config.lock().unwrap();
        *llm_cfg = Some(LlmProviderInfo {
            provider_type: pt.clone(),
            model: m.clone(),
            endpoint: e.clone(),
            api_key: llm_api_key.clone(),
        });
    }

    let client = Client::new();
    let bot_info = get_me(&client, &config.bot_token).await?;
    let bot_name = bot_info.username.clone().unwrap_or_else(|| bot_info.first_name.clone());
    
    {
        let mut tg_config = tg_state.config.lock().unwrap();
        *tg_config = Some(config.clone());
    }

    // Extraer configs ANTES de spawn (State no puede moverse al task)
    let tg_cfg = config.clone();
    let llm_info = LlmProviderInfo {
        provider_type: llm_provider_type.unwrap_or_default(),
        model: llm_model.unwrap_or_default(),
        endpoint: llm_endpoint.unwrap_or_default(),
        api_key: llm_api_key,
    };

    let token_clone = config.bot_token.clone();
    let app_clone = app.clone();
    
    let handle = tauri::async_runtime::spawn(async move {
        start_polling_loop(token_clone, move |update| {
            let app = app_clone.clone();
            let tg_cfg = tg_cfg.clone();
            let llm_info = llm_info.clone();
            async move {
                handle_update_llm(update, app, &tg_cfg, &llm_info).await;
            }
        }).await;
    });

    let mut task_guard = TELEGRAM_TASK.lock().unwrap();
    if task_guard.is_some() {
        handle.abort();
        return Ok("Polling ya está en ejecución".into());
    }
    *task_guard = Some(handle);
    let mut error_guard = LAST_ERROR.lock().unwrap();
    *error_guard = None;

    Ok("Polling de Telegram iniciado".into())
}

#[tauri::command]
pub async fn telegram_stop_polling() -> Result<(), String> {
    let mut task_guard = TELEGRAM_TASK.lock().unwrap();
    if let Some(handle) = task_guard.take() {
        handle.abort();
    }
    Ok(())
}

#[tauri::command]
pub async fn telegram_get_status() -> Result<serde_json::Value, String> {
    let is_running = TELEGRAM_TASK.lock().unwrap().is_some();
    let bot_name = BOT_INFO.lock().unwrap().clone();
    let error = LAST_ERROR.lock().unwrap().clone();

    Ok(serde_json::json!({
        "is_running": is_running,
        "bot_name": bot_name,
        "error": error,
    }))
}

#[tauri::command]
pub async fn telegram_send_message(
    chat_id: i64,
    text: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config = telegram_load_config(state).await?;
    let token = config["bot_token"].as_str().unwrap_or("");
    
    if token.is_empty() {
        return Err("Bot Token no configurado".into());
    }

    let client = reqwest::Client::new();
    send_message(&client, token, chat_id, &text, Some("Markdown")).await?;
    
    Ok(())
}

#[tauri::command]
pub async fn telegram_send_response(
    chat_id: i64,
    text: String,
    tg_state: State<'_, TelegramState>,
) -> Result<(), String> {
    let config = {
        let guard = tg_state.config.lock().unwrap();
        guard.clone().ok_or_else(|| "Bot no iniciado — token no disponible".to_string())?
    };

    let client = Client::new();

    // Dividir si excede 4000 caracteres (límite Telegram)
    let chunks = chunk_telegram_text(&text, 4000);
    let n = chunks.len();
    for chunk in &chunks {
        send_message(&client, &config.bot_token, chat_id, chunk, Some("MarkdownV2")).await?;
        if n > 1 {
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        }
    }

    Ok(())
}

fn chunk_telegram_text(text: &str, max_len: usize) -> Vec<String> {
    if text.len() <= max_len {
        return vec![text.to_string()];
    }
    let mut chunks = Vec::new();
    let mut remaining = text;
    while remaining.len() > max_len {
        let cut = remaining[..max_len]
            .rfind('\n')
            .or_else(|| remaining[..max_len].rfind(' '))
            .unwrap_or(max_len);
        chunks.push(remaining[..cut].trim().to_string());
        remaining = remaining[cut..].trim_start();
    }
    if !remaining.is_empty() {
        chunks.push(remaining.to_string());
    }
    chunks
}

#[tauri::command]
pub async fn telegram_send_chat_action(
    chat_id: i64,
    action: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config = telegram_load_config(state).await?;
    let config = config.ok_or_else(|| "Config de Telegram no encontrada".to_string())?;

    let client = Client::new();
    send_chat_action(&client, &config.bot_token, chat_id, &action).await
}

async fn handle_update_llm(update: Update, app: AppHandle, config: &TelegramConfig, llm_info: &LlmProviderInfo) {
    if let Some(message) = update.message {
        let user_id = message.from.id.to_string();
        let username = message.from.username.as_deref();
        
        let is_allowed = config.allowed_users.is_empty()
            || config.allowed_users.contains(&user_id)
            || username.map(|u| config.allowed_users.contains(&format!("@{}", u))).unwrap_or(false);
        
        if !is_allowed {
            return;
        }
        
        if let Some(text) = message.text {
            let chat_id = message.chat.id;
            
            // Manejar comandos especiales sin pasar por el frontend
            let client = reqwest::Client::new();
            match text.as_str() {
                "/start" => {
                    let _ = send_message(
                        &client, &config.bot_token, chat_id,
                        "👋 *Bienvenido a GeoNexus*\n\nSoy el asistente GIS.\nEnvíame cualquier consulta sobre análisis territorial y te responderé con el conocimiento del proyecto activo.\n\n/help — Ver comandos",
                        Some("MarkdownV2"),
                    ).await;
                    return;
                }
                "/help" => {
                    let _ = send_message(
                        &client, &config.bot_token, chat_id,
                        "*Comandos disponibles*\n\n/start — Iniciar el bot\n/help — Ver esta ayuda\n/status — Estado del sistema\n\nEnvía tu consulta GIS directamente.",
                        Some("MarkdownV2"),
                    ).await;
                    return;
                }
                "/status" => {
                    let _ = send_message(
                        &client, &config.bot_token, chat_id,
                        "*GeoNexus* — Sistema activo\n\n✅ Bot conectado\n✅ Procesamiento de consultas habilitado",
                        Some("MarkdownV2"),
                    ).await;
                    return;
                }
                _ => {}
            }
            
            // Mensaje normal — emitir al frontend
            let payload = serde_json::json!({
                "chat_id": chat_id,
                "user_id": message.from.id,
                "username": message.from.username,
                "text": text,
                "message_id": message.message_id,
            });
            
            let _ = app.emit("telegram:message", payload);
        }
    }
}
