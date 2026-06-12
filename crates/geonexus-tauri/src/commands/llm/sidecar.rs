use std::path::PathBuf;
use std::io::BufRead;
use tauri::Emitter;

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
    if let Some((key, value)) = env_var {
        command.env(key, value);
    }

    let output = command
        .output()
        .map_err(|e| format!("Fallo al ejecutar sidecar Python: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Error en sidecar Python: {stderr} {stdout}"));
    }

    Ok(stdout)
}

pub fn run_sidecar_streaming(
    args: &[&str],
    app_handle: Option<&tauri::AppHandle>,
) -> Result<String, String> {
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

    for line in reader.lines() {
        let line = line.map_err(|e| format!("Error leyendo stdout del sidecar: {e}"))?;
        if line.trim().is_empty() {
            continue;
        }

        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
            match val["type"].as_str() {
                Some("delta") => {
                    if let Some(content) = val["content"].as_str() {
                        if let Some(handle) = app_handle {
                            let _ = handle.emit("llm:token", content);
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

    Ok(done_line)
}

pub fn project_root() -> PathBuf {
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
    ) -> Result<String, String> {
        run_sidecar_streaming(args, app_handle)
    }
}
