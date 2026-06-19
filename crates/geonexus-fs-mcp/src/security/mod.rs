pub mod path_guard;
pub mod level_guard;
pub mod rate_guard;
pub mod confirm_gate;

pub use path_guard::{PathGuard, PathGuardError};
pub use level_guard::{LevelGuard, LevelGuardError};
pub use rate_guard::{RateGuard, RateGuardError};
pub use confirm_gate::{ConfirmGate, ConfirmPreview};

use std::sync::Arc;
use crate::config::FilesystemConfig;

/// Chain of Responsibility for security guards.
/// Each guard can reject the operation independently.
pub struct GuardChain {
    pub path_guard: PathGuard,
    pub level_guard: LevelGuard,
    pub rate_guard: RateGuard,
    pub confirm_gate: Arc<ConfirmGate>,
}

impl GuardChain {
    pub fn new(config: &FilesystemConfig) -> Self {
        let denied: Vec<String> = config.denied_extensions().to_vec();
        let roots: Vec<std::path::PathBuf> = config.allowed_paths.iter()
            .map(|e| std::path::PathBuf::from(&e.path))
            .collect();

        Self {
            path_guard: PathGuard::new(roots, denied),
            level_guard: LevelGuard::new(&config.allowed_paths_map()),
            rate_guard: RateGuard::default(),
            confirm_gate: Arc::new(ConfirmGate::new(
                config.global_defaults.require_confirm_for.clone(),
            )),
        }
    }
}
