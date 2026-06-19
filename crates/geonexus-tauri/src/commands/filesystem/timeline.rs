use tauri::State;

#[tauri::command]
pub async fn get_filesystem_timeline(
    facade: State<'_, geonexus_fs_mcp::facade::FilesystemMcpFacade>,
    limit: Option<usize>,
) -> Result<Vec<geonexus_fs_mcp::timeline::TimelineEntry>, String> {
    let limit = limit.unwrap_or(50);
    Ok(facade.timeline().recent(limit))
}
