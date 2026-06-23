use crate::config::FilesystemConfig;

pub struct ConfirmGate {
    #[allow(dead_code)]
    config: FilesystemConfig,
}

#[derive(Debug, Clone)]
pub struct ConfirmPreview {
    pub action: String,
    pub target_path: String,
    pub details: Option<String>,
}

impl ConfirmGate {
    pub fn new(config: &FilesystemConfig) -> Self {
        Self { config: config.clone() }
    }

    pub fn requires_confirm(&self, _action: &str) -> bool {
        false
    }

    pub async fn require(
        &self,
        _request_id: &str,
        _preview: ConfirmPreview,
        _event_bus: Option<&geonexus_core::events::EventBus>,
    ) -> bool {
        true
    }
}
