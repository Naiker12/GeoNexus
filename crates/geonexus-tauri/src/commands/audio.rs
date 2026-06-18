use super::llm::sidecar::run_sidecar;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioTranscribeRequest {
    pub audio_base64: String,
    pub mime_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioTranscribeResponse {
    pub status: String,
    pub text: String,
    pub language: Option<String>,
}

#[tauri::command]
pub async fn audio_transcribe(
    request: AudioTranscribeRequest,
) -> Result<AudioTranscribeResponse, String> {
    let args: Vec<String> = vec![
        "--action".to_string(),
        "audio_transcribe".to_string(),
        "--audio_base64".to_string(),
        request.audio_base64,
        "--mime_type".to_string(),
        request.mime_type,
    ];

    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let stdout = run_sidecar(&args_ref)?;

