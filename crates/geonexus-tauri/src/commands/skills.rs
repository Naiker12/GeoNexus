use tauri::{AppHandle, Manager, State};
use crate::AppState;

fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

#[tauri::command]
pub async fn list_skills(
    state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, String> {
    geonexus_db::skills::registry::list_skills(&state.db)
        .await
        .map(|s| s.into_iter().map(|x| serde_json::to_value(x).unwrap()).collect())
}

#[tauri::command]
pub async fn install_skill_from_file(
    state: State<'_, AppState>,
    app: AppHandle,
    skill_md_path: String,
    source_url: Option<String>,
) -> Result<serde_json::Value, String> {
    let skills_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error obteniendo app_data_dir: {e}"))?
        .join("skills");

    let now = unix_now();
    geonexus_db::skills::registry::install_from_file(
        &state.db, &skill_md_path, &skills_dir, source_url, now,
    )
    .await
    .map(|s| serde_json::to_value(s).unwrap())
}

#[tauri::command]
pub async fn toggle_skill(
    state: State<'_, AppState>,
    skill_id: String,
    enabled: bool,
) -> Result<(), String> {
    geonexus_db::skills::registry::toggle_skill(&state.db, &skill_id, enabled).await
}

#[tauri::command]
pub async fn read_skill_md(
    state: State<'_, AppState>,
    skill_id: String,
) -> Result<String, String> {
    geonexus_db::skills::registry::read_skill_md(&state.db, &skill_id).await
}

#[tauri::command]
pub async fn install_skill_from_github(
    state: State<'_, AppState>,
    app: AppHandle,
    github_url: String,
) -> Result<Vec<serde_json::Value>, String> {
    let raw_url = normalize_github_url(&github_url);

    let content = reqwest::get(&raw_url)
        .await
        .map_err(|e| format!("Error descargando {raw_url}: {e}"))?
        .text()
        .await
        .map_err(|e| format!("Error leyendo respuesta: {e}"))?;

    let tmp = std::env::temp_dir().join("geonexus_skill_tmp.md");
    std::fs::write(&tmp, &content)
        .map_err(|e| format!("Error escribiendo temp: {e}"))?;

    let skills_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error obteniendo app_data_dir: {e}"))?
        .join("skills");

    let now = unix_now();
    let skill = geonexus_db::skills::registry::install_from_file(
        &state.db,
        tmp.to_str().ok_or("Ruta temp inválida")?,
        &skills_dir,
        Some(github_url),
        now,
    )
    .await?;

    // Limpiar temp
    let _ = std::fs::remove_file(&tmp);

    Ok(vec![serde_json::to_value(skill).unwrap()])
}

/// Normaliza una URL de GitHub a raw.githubusercontent.com
fn normalize_github_url(url: &str) -> String {
    if url.contains("raw.githubusercontent.com") {
        return url.to_string();
    }
    // https://github.com/user/repo → https://raw.githubusercontent.com/user/repo/main/SKILL.md
    let base = url
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/");
    if !base.contains("/main/") && !base.contains("/master/") {
        format!("{}/main/SKILL.md", base.trim_end_matches('/'))
    } else {
        base
    }
}
