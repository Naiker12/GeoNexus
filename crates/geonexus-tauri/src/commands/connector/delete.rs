use tauri::State;
use crate::AppState;
use crate::commands::connector::unix_now;

#[tauri::command]
pub async fn delete_connector(
    connector_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    if connector_id.trim().is_empty() {
        return Err("connector_id requerido".into());
    }
    geonexus_db::connector_repo::delete_connector_config(&state.db, &connector_id)
        .await
        .map_err(|e| format!("Error al eliminar conector: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn update_connector(
    connector_id: String,
    display_name: Option<String>,
    root_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let now = unix_now();
    let mut sets: Vec<String> = vec!["updated_at = ?1".to_string()];
    let mut idx = 2;

    if display_name.is_some() {
        sets.push(format!("display_name = ?{idx}"));
        idx += 1;
    }
    if root_path.is_some() {
        sets.push(format!("root_path = ?{idx}"));
        idx += 1;
    }

    let sql = format!("UPDATE connector_configs SET {} WHERE id = ?{idx}", sets.join(", "));

    let mut q = sqlx::query(&sql).bind(now);
    if let Some(ref name) = display_name {
        q = q.bind(name);
    }
    if let Some(ref path) = root_path {
        q = q.bind(path);
    }
    q = q.bind(&connector_id);

    q.execute(&state.db)
        .await
        .map_err(|e| format!("Error al actualizar conector: {e}"))?;

    Ok(())
}
