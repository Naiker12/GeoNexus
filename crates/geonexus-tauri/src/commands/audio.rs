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

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioSynthesizeRequest {
    pub text: String,
    pub voice: Option<String>,
    pub speed: Option<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioSynthesizeResponse {
    pub status: String,
    pub audio_base64: String,
    pub mime_type: String,
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

    serde_json::from_str(&stdout).map_err(|e| format!("Error parsing sidecar response: {}", e))
}

#[tauri::command]
pub async fn audio_synthesize(
    request: AudioSynthesizeRequest,
) -> Result<AudioSynthesizeResponse, String> {
    let mut args: Vec<String> = vec![
        "--action".to_string(),
        "audio_synthesize".to_string(),
        "--text".to_string(),
        request.text,
    ];

    if let Some(voice) = request.voice {
        args.push("--voice".to_string());
        args.push(voice);
    }

    if let Some(speed) = request.speed {
        args.push("--speed".to_string());
        args.push(speed.to_string());
    }

    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    let stdout = run_sidecar(&args_ref)?;

    serde_json::from_str(&stdout).map_err(|e| format!("Error parsing sidecar response: {}", e))
}
