use std::path::{Path, PathBuf};
use tauri::State;
use crate::AppState;

/// Archivos de identidad del agente.
/// Se almacenan en `<app_data_dir>/agent/` junto al geonexus.db.
const IDENTITY_FILES: &[&str] = &["IDENTITY.md", "USER.md", "SOUL.md"];

fn agent_dir(state: &AppState) -> PathBuf {
    Path::new(&state.db_path)
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .join("agent")
}

fn validate_filename(file: &str) -> Result<(), String> {
    if !IDENTITY_FILES.contains(&file) {
        return Err(format!(
            "Archivo de identidad no válido: '{}'. Permitidos: {:?}",
            file, IDENTITY_FILES
        ));
    }
    Ok(())
}

/// Lee un archivo de identidad (IDENTITY.md, USER.md o SOUL.md).
/// Retorna `""` si el archivo no existe.
#[tauri::command]
pub async fn read_identity_file(
    file: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    validate_filename(&file)?;
    let path = agent_dir(&state).join(&file);
    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(format!("Error leyendo {}: {}", file, e)),
    }
}

/// Escribe un archivo de identidad.
/// Crea el directorio `agent/` si no existe.
#[tauri::command]
pub async fn write_identity_file(
    file: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    validate_filename(&file)?;
    let dir = agent_dir(&state);
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Error creando directorio agent/: {}", e))?;
    let path = dir.join(&file);
    std::fs::write(&path, &content)
        .map_err(|e| format!("Error escribiendo {}: {}", file, e))?;
    Ok(())
}

/// Lee los tres archivos de identidad y los concatena como contexto
/// para inyectar en el system prompt del chat.
/// Retorna un String vacío si no hay archivos de identidad configurados.
pub fn load_identity_context(state: &AppState) -> String {
    let dir = agent_dir(state);
    let mut parts: Vec<String> = Vec::new();

    for (filename, header) in [
        ("IDENTITY.md", "## Identidad del agente"),
        ("USER.md", "## Preferencias del usuario"),
        ("SOUL.md", "## Personalidad y tono"),
    ] {
        let path = dir.join(filename);
        if let Ok(content) = std::fs::read_to_string(&path) {
            let content = content.trim().to_string();
            if !content.is_empty() {
                parts.push(format!("{}\n{}", header, content));
            }
        }
    }

    if parts.is_empty() {
        String::new()
    } else {
        format!("# Configuración de identidad\n\n{}", parts.join("\n\n"))
    }
}
