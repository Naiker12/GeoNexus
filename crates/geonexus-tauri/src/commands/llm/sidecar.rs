use std::path::PathBuf;
use std::io::BufRead;
use tauri::Emitter;
use serde_json::json;
use geonexus_core::reasoning::{ReasoningDelta, ReasoningEnd};

pub fn run_sidecar(args: &[&str]) -> Result<String, String> {
    run_sidecar_with_env(args, None)
}

fn run_sidecar_with_env(args: &[&str], env_var: Option<(&str, &str)>) -> Result<String, String> {
    let root_path = project_root();
    let python_exe = python_executable(&root_path);
    let sidecar_script = root_path.join("ai").join("sidecar.py");

    if !sidecar_script.exists() {
        return Err(format!(
            "No se encontro sidecar.py en {}",
            sidecar_script.display()
        ));
    }

    let mut command = std::process::Command::new(&python_exe);
    command.arg(&sidecar_script).args(args).current_dir(&root_path);
    command.env("PYTHONIOENCODING", "utf-8");
    command.env("PYTHONUTF8", "1");
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    if let Some((key, value)) = env_var {
        command.env(key, value);
    }

    let output = command
        .output()
        .map_err(|e| format!("Fallo al ejecutar sidecar Python: {e}"))?;

    let stdout = String::from_utf8(output.stdout)
        .map_err(|e| format!("stdout del sidecar no es UTF-8 válido: {e}"))?
        .trim()
        .to_string();
    if !output.status.success() {
        let stderr = String::from_utf8(output.stderr)
            .map_err(|e| format!("stderr del sidecar no es UTF-8 válido: {e}"))?;
        return Err(format!("Error en sidecar Python: {stderr} {stdout}"));
    }

    Ok(stdout)
}

pub fn run_sidecar_streaming(
    args: &[&str],
    app_handle: Option<&tauri::AppHandle>,
    gen_event_id: Option<&str>,
    step_id: Option<&str>,
    conversation_id: Option<&str>,
    message_id: Option<&str>,
) -> Result<(String, Option<String>, u64), String> {
    // Fallback to subprocess
    let root_path = project_root();
    let python_exe = python_executable(&root_path);
    let sidecar_script = root_path.join("ai").join("sidecar.py");

    if !sidecar_script.exists() {
        return Err(format!(
            "No se encontro sidecar.py en {}",
            sidecar_script.display()
        ));
    }

    let mut command = std::process::Command::new(&python_exe);
    command.arg(&sidecar_script).args(args).current_dir(&root_path);
    command.env("PYTHONIOENCODING", "utf-8");
    command.env("PYTHONUTF8", "1");
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());

    let mut child = command
        .spawn()
        .map_err(|e| format!("Fallo al ejecutar sidecar Python: {e}"))?;

    let stdout = child.stdout.take()
        .ok_or_else(|| "No se pudo capturar stdout del sidecar".to_string())?;
    let mut stderr = child.stderr.take()
        .ok_or_else(|| "No se pudo capturar stderr del sidecar".to_string())?;

    let reader = std::io::BufReader::new(stdout);
    let mut done_line = String::new();
    let mut token_count: u32 = 0;
    let mut last_subitem_emit = std::time::Instant::now();
    let mut reasoning_buffer = String::new();
    let start_time = std::time::Instant::now();
    let now_iso = || -> String {
        std::time::SystemTime::now()
            .duration_since(std::time::SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
            .to_string()
    };

    for line in reader.lines() {
        let line = line.map_err(|e| format!("Error leyendo stdout del sidecar: {e}"))?;
        if line.trim().is_empty() {
            continue;
        }

        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
            match val["type"].as_str() {
                Some("delta") | Some("text_delta") => {
                    if let Some(content) = val["content"].as_str() {
                        if let Some(handle) = app_handle {
                            let _ = handle.emit("llm:token", content);
                            if let Some(eid) = gen_event_id {
                                let _ = handle.emit("chat:preview_chunk", json!({
                                    "event_id": eid,
                                    "chunk_type": "text",
                                    "content": content,
                                }));
                            }
                        }
                        token_count += if content.len() < 4 { 1 } else { (content.len() as f64 / 4.0).ceil() as u32 };
                        if let Some(sid) = step_id {
                            if last_subitem_emit.elapsed().as_millis() > 500 {
                                let _ = app_handle.map(|h| h.emit("reasoning:sub_item", json!({
                                    "step_id": sid,
                                    "text": format!("{} tokens generados...", token_count),
                                })));
                                last_subitem_emit = std::time::Instant::now();
                            }
                        }
                    }
                }
                Some("thinking") | Some("reasoning_delta") => {
                    if let Some(content) = val["content"].as_str() {
                        reasoning_buffer.push_str(content);
                        if let (Some(handle), Some(conv_id), Some(msg_id)) = (app_handle, conversation_id, message_id) {
                            let delta = ReasoningDelta {
                                conversation_id: conv_id.to_string(),
                                message_id: msg_id.to_string(),
                                delta: content.to_string(),
                                timestamp: now_iso(),
                            };
                            let _ = handle.emit("reasoning:delta", delta);
                        }
                    }
                }
                Some("done") => {
                    done_line = line;
                }
                Some("error") => {
                    let msg = val["message"].as_str().unwrap_or("Error desconocido del LLM");
                    let _ = std::io::read_to_string(&mut stderr);
                    return Err(msg.to_string());
                }
                _ => {}
            }
        }
    }

    let _ = child.wait();
    let _stderr_output = std::io::read_to_string(&mut stderr).unwrap_or_default();

    if done_line.is_empty() {
        return Err("El sidecer no emitió una respuesta final (done)".to_string());
    }

    let duration_ms = start_time.elapsed().as_millis() as u64;
    if let (Some(handle), Some(conv_id), Some(msg_id)) = (app_handle, conversation_id, message_id) {
        let end_event = ReasoningEnd {
            conversation_id: conv_id.to_string(),
            message_id: msg_id.to_string(),
            full_text: reasoning_buffer.clone(),
            duration_ms,
        };
        let _ = handle.emit("reasoning:end", end_event);
    }

    Ok((done_line, if reasoning_buffer.is_empty() { None } else { Some(reasoning_buffer) }, duration_ms))
}

pub fn project_root() -> PathBuf {
    // 1) App instalada: los recursos empaquetados están en {exe_dir}/resources/
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let candidates = [
                exe_dir.join("resources"),             // Tauri 2 bundle (Windows MSI)
                exe_dir.to_path_buf(),                  // portable / desarrollo
            ];
            for base in &candidates {
                if base.join("ai").join("sidecar.py").exists() {
                    return base.clone();
                }
            }
        }
    }
    // 2) Desarrollo: caminar hacia arriba desde el directorio actual
    let mut dir = std::env::current_dir().unwrap_or_default();
    loop {
        if dir.join("ai").join("sidecar.py").exists() {
            return dir;
        }
        if !dir.pop() {
            break;
        }
    }
    std::env::current_dir().unwrap_or_default()
}

pub fn python_executable(root_path: &PathBuf) -> String {
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

pub struct PythonSidecar;

impl PythonSidecar {
    pub fn new() -> Self {
        Self
    }

    pub fn run(&self, args: &[&str]) -> Result<String, String> {
        run_sidecar(args)
    }

    pub fn run_with_env(
        &self,
        args: &[&str],
        key: &str,
        value: &str,
    ) -> Result<String, String> {
        run_sidecar_with_env(args, Some((key, value)))
    }

    pub fn run_streaming(
        &self,
        args: &[&str],
        app_handle: Option<&tauri::AppHandle>,
        gen_event_id: Option<&str>,
    ) -> Result<String, String> {
        let (line, _, _) = run_sidecar_streaming(args, app_handle, gen_event_id, None, None, None)?;
        Ok(line)
    }
}