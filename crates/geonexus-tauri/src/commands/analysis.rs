use tauri::State;
use crate::AppState;
use geonexus_db::analysis_repo;

#[tauri::command]
pub async fn get_analysis_metrics(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<analysis_repo::AnalysisMetrics, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    analysis_repo::get_analysis_metrics(&state.db, &project_id).await
}

#[tauri::command]
pub async fn get_token_timeline(
    project_id: String,
    timeframe: String,
    state: State<'_, AppState>,
) -> Result<Vec<analysis_repo::TokenBucket>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    let tf = match timeframe.as_str() {
        "7d" | "30d" => timeframe,
        _ => "hoy".to_string(),
    };
    analysis_repo::get_token_timeline(&state.db, &project_id, &tf).await
}

#[tauri::command]
pub async fn get_model_usage(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<analysis_repo::ModelUsage>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    analysis_repo::get_model_usage(&state.db, &project_id).await
}

#[tauri::command]
pub async fn list_analysis_runs(
    project_id: String,
    limit: Option<i64>,
    offset: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<analysis_repo::AnalysisRun>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    let limit = limit.unwrap_or(50).clamp(1, 100);
    let offset = offset.unwrap_or(0).max(0);
    analysis_repo::list_analysis_runs(&state.db, &project_id, limit, offset).await
}

#[tauri::command]
pub async fn get_skill_usage(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<analysis_repo::SkillUsage>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    analysis_repo::get_skill_usage(&state.db, &project_id).await
}

#[tauri::command]
pub async fn export_analysis_traces(
    project_id: String,
    format: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    match format.as_str() {
        "json" => analysis_repo::export_traces_as_json(&state.db, &project_id).await,
        _ => analysis_repo::export_traces_as_csv(&state.db, &project_id).await,
    }
}

#[tauri::command]
pub async fn get_cost_by_timeframe(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<analysis_repo::CostSummary, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    analysis_repo::get_cost_by_timeframe(&state.db, &project_id).await
}

#[tauri::command]
pub async fn get_top_queries(
    project_id: String,
    limit: i64,
    state: State<'_, AppState>,
) -> Result<Vec<analysis_repo::TopQuery>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    analysis_repo::get_top_queries(&state.db, &project_id, limit).await
}
