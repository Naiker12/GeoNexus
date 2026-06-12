use tauri::command;

#[command]
pub fn send_os_notification(title: String, body: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use notify_rust::Notification;
        Notification::new()
            .summary(&title)
            .body(&body)
            .appname("GeoNexus")
            .show()
            .map_err(|e| format!("{e}"))?;
    }
    Ok(())
}

#[command]
pub fn request_notification_permission() -> bool {
    true
}
