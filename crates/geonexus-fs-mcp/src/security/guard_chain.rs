use std::sync::Arc;
use crate::config::FilesystemConfig;
use super::path_guard::PathGuard;
use super::level_guard::LevelGuard;
use super::rate_guard::RateGuard;
use super::confirm_gate::ConfirmGate;

pub struct GuardChain {
    pub path_guard: PathGuard,
    pub level_guard: LevelGuard,
    pub rate_guard: RateGuard,
    pub confirm_gate: Arc<ConfirmGate>,
}

impl GuardChain {
    pub fn new(config: &FilesystemConfig) -> Self {
        Self {
            path_guard: PathGuard::from_config(config),
            level_guard: LevelGuard::new(config),
            rate_guard: RateGuard::new(config),
            confirm_gate: Arc::new(ConfirmGate::new(config)),
        }
    }
}
