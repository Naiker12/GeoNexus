use std::time::{SystemTime, UNIX_EPOCH};

use geonexus_core::chat::{
    ChunkReference, Conversation, Message, MessageRole, SendMessageInput, SendMessageResponse,
};
use geonexus_db::chat_repo;
use serde::Deserialize;
use tauri::State;
use uuid::Uuid;

use crate::commands::llm::run_sidecar;
use crate::AppState;

#[derive(Debug, Deserialize)]
struct SidecarChatResult {
    status: String,
    text: Option<String>,
    message: Option<String>,
}

#[tauri::command]
pub async fn send_message(
    input: SendMessageInput,
    state: State<'_, AppState>,
) -> Result<SendMessageResponse, String> {
    input.validate()?;

    let trace_id = Uuid::new_v4().to_string();
    let now = unix_now();
    let conversation_id = ensure_conversation(&state, &input).await?;

    let user_msg = Message {
        id: Uuid::new_v4().to_string(),
        conversation_id: conversation_id.clone(),
        role: MessageRole::User,
        content: input.content.trim().to_string(),
        provider: None,
        model: None,
        trace_id: trace_id.clone(),
        chunks_used: vec![],
        nodes_used: vec![],
        tool_calls: vec![],
        created_at: now,
    };

    chat_repo::insert_message(&state.db, &user_msg).await?;

    if input.conversation_id.is_none() {
        let title = title_from_message(&input.content);
        let _ = chat_repo::update_conversation_title(&state.db, &conversation_id, &title).await;
    }

    let history = chat_repo::list_messages(&state.db, &conversation_id).await?;
    let prompt = build_prompt(&history);
    let output = run_sidecar(&[
        "--action",
        "chat_llm",
        "--provider_type",
        &input.provider,
        "--base_url",
        &input.endpoint,
        "--model",
        &input.model,
        "--prompt",
        &prompt,
    ])?;

    let sidecar: SidecarChatResult = serde_json::from_str(&output)
        .map_err(|e| format!("Error deserializando respuesta LLM: {e}. Output: {output}"))?;

    if sidecar.status != "ok" {
        return Err(sidecar
            .message
            .unwrap_or_else(|| "El proveedor LLM no pudo responder".into()));
    }

    let assistant_content = sidecar
        .text
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
        .ok_or_else(|| "El LLM devolvio una respuesta vacia".to_string())?;

    let assistant_msg = Message {
        id: Uuid::new_v4().to_string(),
        conversation_id: conversation_id.clone(),
        role: MessageRole::Assistant,
        content: assistant_content,
        provider: Some(input.provider),
        model: Some(input.model),
        trace_id: trace_id.clone(),
        chunks_used: vec![],
        nodes_used: vec![],
        tool_calls: vec![],
        created_at: unix_now(),
    };

    chat_repo::insert_message(&state.db, &assistant_msg).await?;

    Ok(SendMessageResponse {
        conversation_id,
        message: assistant_msg,
        chunks_used: Vec::<ChunkReference>::new(),
        trace_id,
    })
}

#[tauri::command]
pub async fn list_conversations(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Conversation>, String> {
    if project_id.trim().is_empty() {
        return Err("project_id requerido".into());
    }
    chat_repo::list_conversations(&state.db, &project_id).await
}

#[tauri::command]
pub async fn list_messages(
    conversation_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Message>, String> {
    if conversation_id.trim().is_empty() {
        return Err("conversation_id requerido".into());
    }
    chat_repo::list_messages(&state.db, &conversation_id).await
}

async fn ensure_conversation(
    state: &State<'_, AppState>,
    input: &SendMessageInput,
) -> Result<String, String> {
    if let Some(id) = input.conversation_id.as_ref().filter(|id| !id.trim().is_empty()) {
        return Ok(id.clone());
    }

    let conversation = chat_repo::create_conversation(
        &state.db,
        &input.project_id,
        input.workspace_id.as_deref(),
        &input.provider,
        &input.model,
    )
    .await?;

    Ok(conversation.id)
}

fn build_prompt(history: &[Message]) -> String {
    let start = history.len().saturating_sub(20);
    let mut lines = vec![
        "Eres GeoNexus IA. Responde en espanol claro y con criterio tecnico.".to_string(),
        "Si no tienes contexto documental suficiente, dilo sin inventar citas.".to_string(),
    ];

    for message in &history[start..] {
        let role = match message.role {
            MessageRole::User => "Usuario",
            MessageRole::Assistant => "GeoNexus IA",
            MessageRole::Tool => "Tool",
            MessageRole::System => "Sistema",
        };
        lines.push(format!("{role}: {}", message.content.trim()));
    }

    lines.push("GeoNexus IA:".into());
    lines.join("\n")
}

fn title_from_message(content: &str) -> String {
    let trimmed = content.trim();
    let mut title: String = trimmed.chars().take(48).collect();
    if trimmed.chars().count() > 48 {
        title.push_str("...");
    }
    if title.is_empty() {
        "Nueva conversacion".into()
    } else {
        title
    }
}

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
