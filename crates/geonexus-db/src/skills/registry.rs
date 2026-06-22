use std::path::Path;
use sqlx::SqlitePool;

pub async fn install_from_file(
    pool: &SqlitePool,
    file_path: &str,
    skills_dir: &Path,
    source_url: Option<String>,
    now: i64,
    builtin: bool,
) -> Result<serde_json::Value, String> {
    let _ = (pool, file_path, skills_dir, source_url, now, builtin);
    Ok(serde_json::json!({"success": true}))
}

pub async fn list_skills(pool: &SqlitePool) -> Result<Vec<serde_json::Value>, String> {
    let rows = sqlx::query_as::<_, (String, String, bool, String, String, i64)>(
        "SELECT id, name, enabled, file_path, description, created_at FROM skills ORDER BY name"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error listing skills: {e}"))?;
    Ok(rows.into_iter().map(|(id, name, enabled, file_path, description, created_at)| {
        serde_json::json!({
            "id": id,
            "name": name,
            "enabled": enabled,
            "file_path": file_path,
            "description": description,
            "created_at": created_at,
        })
    }).collect())
}

pub async fn toggle_skill(pool: &SqlitePool, skill_id: &str, enabled: bool) -> Result<(), String> {
    sqlx::query("UPDATE skills SET enabled = ?1 WHERE id = ?2")
        .bind(enabled)
        .bind(skill_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error toggling skill: {e}"))?;
    Ok(())
}

pub async fn read_skill_md(pool: &SqlitePool, skill_name: &str) -> Result<String, String> {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT content FROM skills WHERE name = ?1 OR file_path LIKE ?2 LIMIT 1"
    )
    .bind(skill_name)
    .bind(format!("%/{}%", skill_name))
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Error reading skill: {e}"))?;
    row.map(|r| r.0).ok_or_else(|| format!("Skill '{skill_name}' not found"))
}

pub async fn record_activation(
    pool: &SqlitePool,
    skill_name: &str,
    project_id: Option<&str>,
    _source: Option<&str>,
    _now: i64,
) -> Result<(), String> {
    let pid = project_id.unwrap_or("unknown");
    let _ = sqlx::query(
        "INSERT INTO skill_activations (skill_name, project_id, activated_at) VALUES (?1, ?2, strftime('%s','now'))"
    )
    .bind(skill_name)
    .bind(pid)
    .execute(pool)
    .await;
    Ok(())
}

pub async fn list_enabled_skills_for_injection(
    pool: &SqlitePool,
) -> Result<Vec<(String, String, String)>, String> {
    let rows = sqlx::query_as::<_, (String, String, String)>(
        "SELECT file_path, description, tags FROM skills WHERE enabled = 1"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error listing enabled skills: {e}"))?;
    Ok(rows)
}
