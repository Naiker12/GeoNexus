use tauri::Emitter;
use uuid::Uuid;

pub fn emit_stream_event(handle: Option<&tauri::AppHandle>, event: &serde_json::Value) {
    if let Some(h) = handle {
        let _ = h.emit("chat:stream_event", event);
    }
}

pub fn emit_preview_chunk(handle: Option<&tauri::AppHandle>, chunk: &serde_json::Value) {
    if let Some(h) = handle {
        let _ = h.emit("chat:preview_chunk", chunk);
    }
}

pub fn stream_event_id() -> String {
    let uuid = Uuid::new_v4().to_string();
    uuid[..8].to_string()
}
