use std::path::PathBuf;

/// Guard that ensures a temporary file is deleted on drop (even on panic).
pub struct TempFileGuard {
    path: Option<PathBuf>,
}

impl TempFileGuard {
    pub fn new(path: PathBuf) -> Self {
        Self { path: Some(path) }
    }

    #[allow(dead_code)]
    pub fn disarm(mut self) {
        self.path = None;
    }
}

impl Drop for TempFileGuard {
    fn drop(&mut self) {
        if let Some(path) = self.path.take() {
            let _ = std::fs::remove_file(&path);
        }
    }
}
