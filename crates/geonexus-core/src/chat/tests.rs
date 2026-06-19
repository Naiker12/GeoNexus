#[cfg(test)]
mod tests {
    use crate::chat::types::{MessageRole, SendMessageInput};

    fn valid_input() -> SendMessageInput {
        SendMessageInput {
            project_id: "p1".into(),
            workspace_id: None,
            conversation_id: None,
            content: "Hola".into(),
            provider: "ollama".into(),
            model: "llama3.1".into(),
            endpoint: "http://localhost:11434".into(),
            api_key: None,
            use_context: false,
            max_context_chunks: None,
            web_search: false,
            mentioned_asset_ids: vec![],
            mentioned_connector_ids: vec![],
            mentioned_node_ids: vec![],
            mentioned_agent_sources: vec![],
            skill_names: vec![],
            attachments: vec![],
        }
    }

    #[test]
    fn role_serializes_snake_case() {
        assert_eq!(
            serde_json::to_string(&MessageRole::Assistant).unwrap(),
            r#""assistant""#
        );
    }

    #[test]
    fn send_message_input_validates_required_fields() {
        assert!(valid_input().validate().is_ok());
        assert!(matches!(
            SendMessageInput {
                project_id: "".into(),
                ..valid_input()
            }
            .validate(),
            Err(_)
        ));
    }
}
