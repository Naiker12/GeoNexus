use tauri::State;
use crate::AppState;

#[tauri::command]
pub async fn get_setting(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<String>, String> {
    if key.trim().is_empty() {
        return Err("key requerido".into());
    }
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT value FROM app_settings WHERE key = ?1"
    )
    .bind(&key)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(row.map(|r| r.0))
}

#[tauri::command]
pub async fn set_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    if key.trim().is_empty() {
        return Err("key requerido".into());
    }
    sqlx::query(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
    )
    .bind(&key)
    .bind(&value)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
