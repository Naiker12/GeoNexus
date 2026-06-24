use std::str::FromStr;
use std::sync::Arc;
use std::time::Duration;
use chrono::Utc;
use cron::Schedule;
use tokio::sync::Mutex;
use tracing::{info, error, warn};

/// Background worker that periodically checks for due automations and executes them.
pub struct SchedulerWorker {
    db: sqlx::SqlitePool,
    running: Arc<Mutex<bool>>,
    interval_secs: u64,
}

impl SchedulerWorker {
    pub fn new(db: sqlx::SqlitePool) -> Self {
        Self {
            db,
            running: Arc::new(Mutex::new(false)),
            interval_secs: 60,
        }
    }

    pub fn with_interval(mut self, secs: u64) -> Self {
        self.interval_secs = secs;
        self
    }

    /// Start the background worker loop. Runs until `stop()` is called.
    pub async fn start(&self) {
        let mut running = self.running.lock().await;
        if *running {
            warn!("Scheduler worker already running");
            return;
        }
        *running = true;
        drop(running);

        let db = self.db.clone();
        let running = self.running.clone();
        let interval = self.interval_secs;

        tokio::spawn(async move {
            info!("Scheduler worker started (interval={interval}s)");

            loop {
                if !*running.lock().await {
                    info!("Scheduler worker stopped");
                    break;
                }

                if let Err(e) = tick(&db).await {
                    error!("Scheduler tick error: {e}");
                }

                tokio::time::sleep(Duration::from_secs(interval)).await;
            }
        });
    }

    /// Signal the worker to stop on the next iteration.
    pub async fn stop(&self) {
        let mut running = self.running.lock().await;
        *running = false;
    }
}

fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Compute next run time from a cron expression.
/// Returns None if the expression is invalid or the schedule never fires again.
fn next_run_from_cron(cron_expr: &str) -> Option<i64> {
    // Normalize: some expressions use "?" which cron crate doesn't accept
    let normalized = cron_expr.replace('?', "*");
    let schedule = Schedule::from_str(&normalized).ok()?;
    let now = Utc::now();
    let next = schedule.after(&now).next()?;
    Some(next.timestamp())
}

async fn tick(db: &sqlx::SqlitePool) -> Result<(), String> {
    let now = now_unix();

    let rows = sqlx::query(
        "SELECT id, name, action_type, action_config, channel, project_id, intent, cron_expression
         FROM automations
         WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?
         ORDER BY next_run_at ASC
         LIMIT 20"
    )
    .bind(now)
    .fetch_all(db)
    .await
    .map_err(|e| format!("Error querying due automations: {e}"))?;

    if rows.is_empty() {
        return Ok(());
    }

    let client = reqwest::Client::new();

    for row in rows {
        use sqlx::Row;

        let id: String = row.get("id");
        let name: String = row.get("name");
        let action_type: String = row.get("action_type");
        let action_config: Option<String> = row.get("action_config");
        let channel: String = row.get("channel");
        let project_id: String = row.get("project_id");
        let cron_expression: Option<String> = row.get("cron_expression");

        info!("Executing automation {id} ({name}) — {action_type}");

        let _ = geonexus_db::automation_repo::record_run(db, &id).await;

        // Dispatch based on action type
        match action_type.as_str() {
            "webhook" => {
                if let Some(config_str) = action_config {
                    if let Ok(config) = serde_json::from_str::<serde_json::Value>(&config_str) {
                        let url = config["url"].as_str().unwrap_or("");
                        let payload = config.get("payload").cloned().unwrap_or(serde_json::json!({}));
                        if !url.is_empty() {
                            match client.post(url).json(&payload).send().await {
                                Ok(resp) => {
                                    if resp.status().is_success() {
                                        info!("Webhook {id} completed successfully");
                                    } else {
                                        warn!("Webhook {id} returned {}", resp.status());
                                    }
                                }
                                Err(e) => {
                                    error!("Webhook {id} error: {e}");
                                }
                            }
                        }
                    }
                }
            }
            "message" | "send_message" | "chat" => {
                info!("Scheduled message for project {project_id} (channel={channel}): {action_config:?}");
                // TODO: dispatch via gateway when subagent background execution is available
            }
            "skill" => {
                info!("Scheduled skill execution for project {project_id}: {action_config:?}");
                // TODO: trigger skill via agent system when background execution is available
            }
            "export" => {
                info!("Scheduled export for project {project_id}: {action_config:?}");
                // TODO: trigger export pipeline
            }
            _ => {
                warn!("Unknown automation action_type: {action_type}");
            }
        }

        // Compute next run from cron expression
        let next = cron_expression.as_deref()
            .and_then(next_run_from_cron)
            .unwrap_or_else(|| now + 86400); // fallback: 1 day

        let _ = sqlx::query(
            "UPDATE automations SET next_run_at = ?, updated_at = ? WHERE id = ?"
        )
        .bind(next)
        .bind(now)
        .bind(&id)
        .execute(db)
        .await;
    }

    Ok(())
}
