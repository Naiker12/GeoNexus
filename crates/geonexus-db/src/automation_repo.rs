use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Automation {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub description: Option<String>,
    pub cron_expression: Option<String>,
    pub intent: String,
    pub action_type: String,
    pub action_config: Option<serde_json::Value>,
    pub channel: String,
    pub enabled: bool,
    pub last_run_at: Option<i64>,
    pub next_run_at: Option<i64>,
    pub run_count: i64,
    pub created_at: i64,
    pub updated_at: i64,
}

fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn row_to_automation(row: &sqlx::sqlite::SqliteRow) -> Automation {
    use sqlx::Row;
    Automation {
        id: row.get("id"),
        project_id: row.get("project_id"),
        name: row.get("name"),
        description: row.get("description"),
        cron_expression: row.get("cron_expression"),
        intent: row.get("intent"),
        action_type: row.get("action_type"),
        action_config: row.get::<Option<String>, _>("action_config")
            .and_then(|s| serde_json::from_str(&s).ok()),
        channel: row.get("channel"),
        enabled: row.get::<i64, _>("enabled") != 0,
        last_run_at: row.get("last_run_at"),
        next_run_at: row.get("next_run_at"),
        run_count: row.get("run_count"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

pub async fn create_automation(
    pool: &SqlitePool,
    project_id: &str,
    name: &str,
    description: Option<&str>,
    intent: &str,
    action_type: &str,
    action_config: Option<&serde_json::Value>,
    channel: &str,
    cron_expression: Option<&str>,
) -> Result<Automation, String> {
    let now = unix_now();
    let id = Uuid::new_v4().to_string();
    let action_config_str = action_config
        .map(|v| serde_json::to_string(v).unwrap_or_default());

    sqlx::query(
        "INSERT INTO automations (id, project_id, name, description, cron_expression, intent, action_type, action_config, channel, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(project_id)
    .bind(name)
    .bind(description)
    .bind(cron_expression)
    .bind(intent)
    .bind(action_type)
    .bind(&action_config_str)
    .bind(channel)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .map_err(|e| format!("Error creando automatizacion: {e}"))?;

    get_automation(pool, &id).await
}

pub async fn get_automation(pool: &SqlitePool, id: &str) -> Result<Automation, String> {
    sqlx::query("SELECT * FROM automations WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error obteniendo automatizacion: {e}"))?
        .map(|r| row_to_automation(&r))
        .ok_or_else(|| format!("Automation {id} not found"))
}

pub async fn list_automations(
    pool: &SqlitePool,
    project_id: &str,
) -> Result<Vec<Automation>, String> {
    sqlx::query(
        "SELECT * FROM automations WHERE project_id = ? ORDER BY created_at DESC"
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error listando automatizaciones: {e}"))?
    .into_iter()
    .map(|r| Ok(row_to_automation(&r)))
    .collect()
}

pub async fn toggle_automation(
    pool: &SqlitePool,
    id: &str,
    enabled: bool,
) -> Result<Automation, String> {
    let now = unix_now();
    sqlx::query(
        "UPDATE automations SET enabled = ?, updated_at = ? WHERE id = ?"
    )
    .bind(enabled as i64)
    .bind(now)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error toggling automation: {e}"))?;
    get_automation(pool, id).await
}

pub async fn update_automation(
    pool: &SqlitePool,
    id: &str,
    name: &str,
    description: Option<&str>,
    intent: &str,
    action_type: &str,
    action_config: Option<&serde_json::Value>,
    channel: &str,
    cron_expression: Option<&str>,
    enabled: bool,
) -> Result<Automation, String> {
    let now = unix_now();
    let action_config_str = action_config
        .map(|v| serde_json::to_string(v).unwrap_or_default());

    sqlx::query(
        "UPDATE automations SET name = ?, description = ?, intent = ?, action_type = ?, action_config = ?, channel = ?, cron_expression = ?, enabled = ?, updated_at = ? WHERE id = ?"
    )
    .bind(name)
    .bind(description)
    .bind(intent)
    .bind(action_type)
    .bind(&action_config_str)
    .bind(channel)
    .bind(cron_expression)
    .bind(enabled as i64)
    .bind(now)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error actualizando automatizacion: {e}"))?;

    get_automation(pool, id).await
}

pub async fn delete_automation(
    pool: &SqlitePool,
    id: &str,
) -> Result<(), String> {
    sqlx::query("DELETE FROM automations WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error eliminando automatizacion: {e}"))?;
    Ok(())
}

pub async fn record_run(
    pool: &SqlitePool,
    id: &str,
) -> Result<(), String> {
    let now = unix_now();
    sqlx::query(
        "UPDATE automations SET last_run_at = ?, run_count = run_count + 1, updated_at = ? WHERE id = ?"
    )
    .bind(now)
    .bind(now)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error registrando ejecucion: {e}"))?;
    Ok(())
}
