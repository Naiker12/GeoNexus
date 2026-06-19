use tauri::{command, State, AppHandle};
use crate::AppState;

const SECURE_PREFIX: &str = "secure:";

#[command]
pub async fn set_secure(
    app: AppHandle,
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    #[cfg(feature = "stronghold")]
    {
        use tauri_plugin_stronghold::StrongholdExt;
        if let Ok(stronghold) = app.try_stronghold() {
            let vault_path = vec!["geonexus".to_string(), "secure".to_string()];
            if let Ok(mut vault) = stronghold.create_client(b"geonexus-secure") {
                let _ = vault.write()
                    .to_store(&vault_path, key.as_bytes(), value.as_bytes());
                return Ok(());
            }
        }
    }

    let _ = &app; // usado solo con feature stronghold

    let db_key = format!("{SECURE_PREFIX}{key}");
    sqlx::query(
        "INSERT INTO app_settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2"
    )
    .bind(&db_key)
    .bind(&value)
    .execute(&state.db)
    .await
    .map_err(|e| format!("Error al guardar en almacén seguro: {e}"))?;

    Ok(())
}

#[command]
pub async fn get_secure(
    app: AppHandle,
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<String>, String> {
    #[cfg(feature = "stronghold")]
    {
        use tauri_plugin_stronghold::StrongholdExt;
        if let Ok(stronghold) = app.try_stronghold() {
            let vault_path = vec!["geonexus".to_string(), "secure".to_string()];
            if let Ok(mut vault) = stronghold.create_client(b"geonexus-secure") {
                if let Ok(data) = vault.read().from_store(&vault_path, key.as_bytes()) {
                    if let Some(bytes) = data {
                        return Ok(Some(String::from_utf8_lossy(&bytes).to_string()));
                    }
                }
            }
        }
    }

    let _ = &app;

    let db_key = format!("{SECURE_PREFIX}{key}");
    let row = sqlx::query_as::<_, (String,)>(
        "SELECT value FROM app_settings WHERE key = ?1"
    )
    .bind(&db_key)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| format!("Error al leer del almacén seguro: {e}"))?;

    Ok(row.map(|r| r.0))
}

#[command]
pub async fn delete_secure(
    app: AppHandle,
    state: State<'_, AppState>,
    key: String,
) -> Result<(), String> {
    #[cfg(feature = "stronghold")]
    {
        use tauri_plugin_stronghold::StrongholdExt;
        if let Ok(stronghold) = app.try_stronghold() {
            let vault_path = vec!["geonexus".to_string(), "secure".to_string()];
            if let Ok(mut vault) = stronghold.create_client(b"geonexus-secure") {
                let _ = vault.write().remove_from_store(&vault_path, key.as_bytes());
                return Ok(());
            }
        }
    }

    let _ = &app;

    let db_key = format!("{SECURE_PREFIX}{key}");
    sqlx::query("DELETE FROM app_settings WHERE key = ?1")
        .bind(&db_key)
        .execute(&state.db)
        .await
        .map_err(|e| format!("Error al eliminar del almacén seguro: {e}"))?;

    Ok(())
}
