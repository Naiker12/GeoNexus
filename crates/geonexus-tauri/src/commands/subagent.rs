use geonexus_core::subagent::*;

#[tauri::command]
pub async fn execute_subagent_tasks(
    tasks: Vec<SubagentTask>,
) -> Result<Vec<SubagentResult>, String> {
    let manager = SubagentManager::new(4);
    let results = manager.execute_all(tasks).await;
    Ok(results)
}

#[tauri::command]
pub async fn get_subagent_results() -> Result<Vec<SubagentResult>, String> {
    Ok(vec![])
}
