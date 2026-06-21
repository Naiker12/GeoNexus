pub mod polling;
pub mod sender;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelegramConfig {
    pub bot_token: String,
    pub allowed_users: Vec<String>,
    pub response_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Update {
    pub update_id: i64,
    pub message: Option<Message>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub message_id: i64,
    pub from: User,
    pub chat: Chat,
    pub text: Option<String>,
    pub date: i64,
    #[serde(default)]
    pub caption: Option<String>,
    #[serde(default)]
    pub voice: Option<Voice>,
    #[serde(default)]
    pub photo: Option<Vec<PhotoSize>>,
    #[serde(default)]
    pub document: Option<Document>,
    #[serde(default)]
    pub sticker: Option<Sticker>,
    #[serde(default)]
    pub audio: Option<Audio>,
    #[serde(default)]
    pub video: Option<Video>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Voice {
    pub file_id: String,
    pub file_unique_id: String,
    pub duration: i64,
    pub mime_type: Option<String>,
    pub file_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhotoSize {
    pub file_id: String,
    pub file_unique_id: String,
    pub width: i64,
    pub height: i64,
    pub file_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub file_id: String,
    pub file_unique_id: String,
    pub file_name: Option<String>,
    pub mime_type: Option<String>,
    pub file_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sticker {
    pub file_id: String,
    pub file_unique_id: String,
    #[serde(rename = "type")]
    pub sticker_type: Option<String>,
    pub emoji: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Audio {
    pub file_id: String,
    pub file_unique_id: String,
    pub duration: i64,
    pub performer: Option<String>,
    pub title: Option<String>,
    pub mime_type: Option<String>,
    pub file_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Video {
    pub file_id: String,
    pub file_unique_id: String,
    pub width: i64,
    pub height: i64,
    pub duration: i64,
    pub mime_type: Option<String>,
    pub file_size: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub is_bot: bool,
    pub first_name: String,
    pub last_name: Option<String>,
    pub username: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chat {
    pub id: i64,
    #[serde(rename = "type")]
    pub chat_type: String,
    pub title: Option<String>,
    pub username: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetUpdatesResponse {
    pub ok: bool,
    pub result: Vec<Update>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GetMeResponse {
    pub ok: bool,
    pub result: User,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendMessageResponse {
    pub ok: bool,
    pub result: Message,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimpleResponse {
    pub ok: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTraceEvent {
    pub r#type: String,
    pub id: String,
    pub parent_id: Option<String>,
    pub category: String,
    pub title: String,
    pub log: Option<String>,
    pub payload: Option<serde_json::Value>,
    pub duration: Option<u64>,
    pub user_friendly_summary: Option<String>,
    pub error: Option<String>,
    pub timestamp: String,
}
