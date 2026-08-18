use crate::AppState;
use geonexus_scheduler::{nl_to_cron, SchedulerWorker};
use serde::Serialize;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

/// Holds the scheduler worker handle so we can start/stop it.
pub struct SchedulerState {
    pub worker: Arc<Mutex<Option<SchedulerWorker>>>,
}

#[derive(Serialize)]
pub struct NlToCronResult {
    pub cron_expression: String,
    pub confidence: f64,
}

// ── NL → Cron ──────────────────────────────────────────────────

#[tauri::command]
pub async fn translate_nl_to_cron(query: String) -> Result<NlToCronResult, String> {
    let (cron, confidence) = nl_to_cron(&query);
    Ok(NlToCronResult { cron_expression: cron, confidence })
}

// ── Worker control ─────────────────────────────────────────────

#[tauri::command]
pub async fn start_scheduler_worker(
    state: State<'_, AppState>,
    scheduler_state: State<'_, SchedulerState>,
) -> Result<String, String> {
    let mut guard = scheduler_state.worker.lock().await;

    if guard.is_some() {
        return Ok("Scheduler already running".into());
    }

    let worker = SchedulerWorker::new(state.db.clone());
    worker.start().await;
    *guard = Some(worker);

    Ok("Scheduler started".into())
}

#[tauri::command]
pub async fn stop_scheduler_worker(
    scheduler_state: State<'_, SchedulerState>,
) -> Result<String, String> {
    let mut guard = scheduler_state.worker.lock().await;

    match guard.take() {
        Some(worker) => {
            worker.stop().await;
            Ok("Scheduler stopped".into())
        }
        None => Ok("Scheduler not running".into()),
    }
}
