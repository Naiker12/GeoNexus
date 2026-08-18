use serde_json::json;
use uuid::Uuid;

use super::temp_files::TempFileGuard;
use super::streaming::{emit_stream_event, stream_event_id};
use super::super::tools::{execute_tool_call, tool_display_label};
use super::super::SidecarChatResult;
use crate::commands::llm::run_sidecar_streaming;

pub struct ToolLoopResult {
    pub final_content: String,
    pub reasoning_content: Option<String>,
    pub reasoning_duration_ms: u64,
    pub trajectory_steps: Vec<serde_json::Value>,
    pub response_model: String,
    pub last_sidecar: Option<super::super::SidecarChatResult>,
}

pub async fn run_tool_loop(
    messages: &mut Vec<serde_json::Value>,
    input: &geonexus_core::chat::SendMessageInput,
    tool_catalog: &crate::commands::chat::tools::ToolCatalog,
    tools_json: &str,
    trace_id: &str,
    conversation_id: &str,
    assistant_msg_id: &str,
    app_handle: Option<&tauri::AppHandle>,
    db: &sqlx::SqlitePool,
) -> Result<ToolLoopResult, String> {
    const MAX_ITER: usize = 10;
    let mut iteration: usize = 0;
    let mut trajectory_steps: Vec<serde_json::Value> = Vec::new();
    let (final_content, last_sidecar) = loop {
        if iteration >= MAX_ITER {
            return Err("El modelo excedio el maximo de llamadas a herramientas (10)".into());
        }

        let gen_event_id = format!("gen-{}", stream_event_id());
        let _ = emit_stream_event(app_handle, &json!({
            "type": "generating",
            "event_id": gen_event_id,
            "conversation_id": conversation_id,
            "status": "running",
        }));

        let mut sidecar_args: Vec<String> = vec![
            "--action".into(),
            "chat_llm_stream".into(),
            "--provider_type".into(),
            input.provider.clone(),
            "--base_url".into(),
            input.endpoint.clone(),
            "--model".into(),
            input.model.clone(),
        ];

        let messages_json = serde_json::to_string(&messages)
            .map_err(|e| format!("Error serializando mensajes: {e}"))?;
        let msgs_file = std::env::temp_dir().join(format!("geonexus_msgs_{}.json", Uuid::new_v4()));
        std::fs::write(&msgs_file, &messages_json)
            .map_err(|e| format!("Error escribiendo archivo temporal de mensajes: {e}"))?;
        let _msgs_guard = TempFileGuard::new(msgs_file.clone());
        sidecar_args.push("--messages_file".into());
        sidecar_args.push(msgs_file.to_string_lossy().to_string());

        let tools_file = std::env::temp_dir().join(format!("geonexus_tools_{}.json", Uuid::new_v4()));
        std::fs::write(&tools_file, &tools_json)
            .map_err(|e| format!("Error escribiendo archivo temporal de tools: {e}"))?;
        let _tools_guard = TempFileGuard::new(tools_file.clone());
        sidecar_args.push("--tools_file".into());
        sidecar_args.push(tools_file.to_string_lossy().to_string());

        if let Some(ref key) = input.api_key {
            sidecar_args.push("--api_key".into());
            sidecar_args.push(key.clone());
        }

        if !input.reasoning_effort.is_empty() {
            sidecar_args.push("--reasoning_effort".into());
            sidecar_args.push(input.reasoning_effort.clone());
        }

        let (output, reasoning_buffer, duration_ms) = run_sidecar_streaming(
            &sidecar_args.iter().map(String::as_str).collect::<Vec<_>>(),
            app_handle,
            Some(&gen_event_id),
            Some("generating"),
            Some(conversation_id),
            Some(assistant_msg_id),
        )?;

        let sidecar: SidecarChatResult = serde_json::from_str(&output)
            .map_err(|e| format!("Error deserializando respuesta LLM: {e}. Output: {output}"))?;

        if sidecar.status != "ok" {
            return Err(sidecar
                .error_message()
                .unwrap_or_else(|| "El proveedor LLM no pudo responder".into()));
        }

        if let Some(tool_calls) = sidecar.tool_calls() {
            messages.push(json!({
                "role": "assistant",
                "content": null,
                "tool_calls": tool_calls,
            }));

            for tc in &tool_calls {
                let tool_event_id = format!("tool-{}", stream_event_id());
                let tool_call_id = tc["id"]
                    .as_str()
                    .unwrap_or("call_unknown")
                    .to_string();
                let tool_name = tc.get("function")
                    .and_then(|f| f.get("name"))
                    .and_then(|n| n.as_str())
                    .unwrap_or("unknown");
                let tool_args = tc.get("function")
                    .and_then(|f| f.get("arguments"))
                    .cloned()
                    .unwrap_or(json!(null));

                let display_name = tool_display_label(tool_name);
                let subtitle: Option<String> = tc.get("function")
                    .and_then(|f| f.get("arguments"))
                    .and_then(|a| a.as_str())
                    .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
                    .and_then(|v| {
                        v.get("path")
                            .or_else(|| v.get("pattern"))
                            .or_else(|| v.get("query"))
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string())
                    });

                let _ = emit_stream_event(app_handle, &json!({
                    "type": "tool_call",
                    "event_id": tool_event_id,
                    "conversation_id": conversation_id,
                    "status": "running",
                    "tool_name": tool_name,
                    "display_name": display_name,
                    "subtitle": subtitle,
                }));

                trajectory_steps.push(json!({
                    "tool": tool_name,
                    "args": tool_args,
                    "call_id": tool_call_id,
                }));

                let (result, tool_success) = execute_tool_call(
                    db,
                    trace_id,
                    tc,
                    &tool_catalog.mcp_tools,
                ).await;

                let lines_read = if tool_name == "read_file" {
                    result.lines().count()
                } else {
                    0
                };
                let _ = emit_stream_event(app_handle, &json!({
                    "type": "tool_call",
                    "event_id": tool_event_id,
                    "conversation_id": conversation_id,
                    "status": if tool_success { "complete" } else { "error" },
                    "tool_name": tool_name,
                    "display_name": display_name,
                    "subtitle": subtitle,
                    "lines_read": lines_read,
                }));

                messages.push(json!({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": result,
                }));
            }

            iteration += 1;
            continue;
        }

        let content = sidecar
            .content()
            .filter(|c| !c.is_empty())
            .ok_or_else(|| "El LLM devolvio una respuesta vacia".to_string())?;

        let sidecar_reasoning = sidecar.reasoning_content();
        let final_reasoning = reasoning_buffer.or(sidecar_reasoning);

        let _ = emit_stream_event(app_handle, &json!({
            "type": "generating",
            "event_id": gen_event_id,
            "conversation_id": conversation_id,
            "status": "complete",
        }));
        break (content, Some((sidecar, final_reasoning, duration_ms)));
    };

    let response_model = last_sidecar
        .as_ref()
        .map(|(s, _, _)| s)
        .and_then(|s| s.model.as_deref())
        .filter(|m| !m.is_empty())
        .map(String::from)
        .unwrap_or_else(|| input.model.clone());

    let (last_sc, reasoning_content, reasoning_duration_ms) = match last_sidecar {
        Some((sc, rc, dur)) => (Some(sc), rc, dur),
        None => (None, None, 0u64),
    };

    Ok(ToolLoopResult {
        final_content,
        reasoning_content,
        reasoning_duration_ms,
        trajectory_steps,
        response_model,
        last_sidecar: last_sc,
    })
}
