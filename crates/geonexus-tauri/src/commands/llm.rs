use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
pub struct LlmProviderConfig {
    pub provider_type: String,
    pub name: Option<String>,
    pub model: Option<String>,
    pub endpoint: String,
}

#[derive(Debug, Deserialize)]
pub struct LlmChatRequest {
    pub provider_type: String,
    pub model: String,
    pub endpoint: String,
    pub prompt: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmPingResult {
    pub status: String,
    pub provider_type: String,
    pub model: Option<String>,
    pub latency_ms: Option<i64>,
    pub message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LlmChatResult {
    pub status: String,
    pub provider_type: String,
    pub model: Option<String>,
    pub text: Option<String>,
    pub message: Option<String>,
}

#[tauri::command]
pub async fn ping_llm_provider(config: LlmProviderConfig) -> Result<LlmPingResult, String> {
    if config.provider_type.trim().is_empty() {
        return Err("provider_type requerido".into());
    }
    if config.endpoint.trim().is_empty() {
        return Err("endpoint requerido".into());
    }

    let output = run_sidecar(&[
        "--action",
        "ping_llm",
        "--provider_type",
        &config.provider_type,
        "--base_url",
        &config.endpoint,
        "--model",
        config.model.as_deref().unwrap_or(""),
    ])?;

    serde_json::from_str(&output)
        .map_err(|e| format!("Error deserializando ping LLM: {e}. Output: {output}"))
}

#[tauri::command]
pub async fn send_llm_message(request: LlmChatRequest) -> Result<LlmChatResult, String> {
    if request.provider_type.trim().is_empty() {
        return Err("provider_type requerido".into());
    }
    if request.endpoint.trim().is_empty() {
        return Err("endpoint requerido".into());
    }
    if request.model.trim().is_empty() {
        return Err("model requerido".into());
    }
    if request.prompt.trim().is_empty() {
        return Err("prompt requerido".into());
    }

    let output = run_sidecar(&[
        "--action",
        "chat_llm",
        "--provider_type",
        &request.provider_type,
        "--base_url",
        &request.endpoint,
        "--model",
        &request.model,
        "--prompt",
        &request.prompt,
    ])?;

    serde_json::from_str(&output)
        .map_err(|e| format!("Error deserializando chat LLM: {e}. Output: {output}"))
}

fn run_sidecar(args: &[&str]) -> Result<String, String> {
    let root_path = project_root();
    let python_exe = python_executable(&root_path);
    let sidecar_script = root_path.join("ai").join("sidecar.py");

    if !sidecar_script.exists() {
        return Err(format!(
            "No se encontro sidecar.py en {}",
            sidecar_script.display()
        ));
    }

    let output = std::process::Command::new(&python_exe)
        .arg(&sidecar_script)
        .args(args)
        .current_dir(&root_path)
        .output()
        .map_err(|e| format!("Fallo al ejecutar sidecar Python: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Error en sidecar Python: {stderr} {stdout}"));
    }

    Ok(stdout)
}

fn project_root() -> PathBuf {
    let current = std::env::current_dir().unwrap_or_default();
    if current.ends_with("geonexus-tauri") {
        current.parent().unwrap_or(&current).to_path_buf()
    } else {
        current
    }
}

fn python_executable(root_path: &PathBuf) -> String {
    let candidates = [
        root_path.join("ai").join(".venv").join("Scripts").join("python.exe"),
        root_path.join(".venv").join("Scripts").join("python.exe"),
        root_path.join("ai").join(".venv").join("bin").join("python"),
        root_path.join(".venv").join("bin").join("python"),
    ];

    candidates
        .iter()
        .find(|candidate| candidate.exists())
        .map(|candidate| candidate.to_string_lossy().to_string())
        .unwrap_or_else(|| "python".to_string())
}
