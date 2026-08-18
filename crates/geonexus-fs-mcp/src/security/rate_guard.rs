use crate::config::FilesystemConfig;

pub struct RateGuard {
    #[allow(dead_code)]
    config: FilesystemConfig,
}

impl RateGuard {
    pub fn new(config: &FilesystemConfig) -> Self {
        Self { config: config.clone() }
    }

    pub fn check(&self) -> Result<(), String> {
        Ok(())
    }

    pub fn check_write(&self, _session_id: &str) -> Result<(), String> {
        Ok(())
    }
}
