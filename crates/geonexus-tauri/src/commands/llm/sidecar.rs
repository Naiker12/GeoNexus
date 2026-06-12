use std::path::PathBuf;

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
