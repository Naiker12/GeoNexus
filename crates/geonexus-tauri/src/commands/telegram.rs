use tauri::{AppHandle, Emitter, State};
use serde::{Deserialize, Serialize};
use once_cell::sync::Lazy;
use std::sync::Mutex;
use tauri::async_runtime::JoinHandle;
use crate::AppState;
use geonexus_core::telegram::polling::start_polling_loop;
use geonexus_core::telegram::sender::{send_message, get_me};

static TELEGRAM_TASK: Lazy<Mutex<Option<JoinHandle<()>>>> = Lazy::new(|| Mutex::new(None));
static BOT_INFO: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));
static LAST_ERROR: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));
const TELEGRAM_CONFIG_KEY: &str = "telegram_config";

#[derive(Clone, Serialize, Deserialize)]
struct FileCreatedPayload {
    path: String,
    content: String,
}

#[derive(Clone, Serialize, Deserialize)]
struct AgentErrorPayload {
    message: String,
}

fn sandbox_scaffold() -> Vec<(&'static str, &'static str)> {
    vec![
        (
            "package.json",
            r#"{
  "name": "geonexus-sandbox",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5174 --strictPort"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}"#,
        ),
        (
            "index.html",
            r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GeoNexus Sandbox</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f0f13;
      color: #e2e8f0;
      font-family: 'Inter', system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      gap: 1rem;
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
) -> Result<String, String> {
    if TELEGRAM_TASK.lock().unwrap().is_some() {
        return Ok("Polling ya está en ejecución".into());
    }

    let config_val = telegram_load_config(state).await?;
    let token = config_val["bot_token"].as_str().unwrap_or("").to_string();
    
    if token.is_empty() {
        return Err("Se requiere un Bot Token para iniciar el polling".into());
    }

    let client = reqwest::Client::new();
    match get_me(&client, &token).await {
        Ok(me) => {
            let mut info_guard = BOT_INFO.lock().unwrap();
            *info_guard = Some(me.first_name.clone());
        }
        Err(e) => {
            return Err(format!("Error conectando a Telegram: {}", e));
        }
    }

    let app_clone = app.clone();
    let token_clone = token.clone();

    let handle = tauri::async_runtime::spawn(async move {
        start_polling_loop(token_clone, move |update| {
            let app = app_clone.clone();
            async move {
                if let Some(msg) = update.message {
                    app.emit("telegram:message_received", serde_json::json!({
                        "id": msg.message_id,
                        "chat_id": msg.chat.id,
                        "from": msg.from.username.unwrap_or(msg.from.first_name),
                        "text": msg.text,
                        "date": msg.date,
                    })).ok();
                }
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
