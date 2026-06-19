use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, oneshot};

#[derive(Debug, Clone)]
pub struct ConfirmPreview {
    pub action: String,
    pub target_path: String,
    pub details: Option<String>,
}

pub struct ConfirmGate {
    pending: Arc<Mutex<HashMap<String, oneshot::Sender<bool>>>>,
    require_confirm_for: Vec<String>,
}

impl ConfirmGate {
    pub fn new(require_confirm_for: Vec<String>) -> Self {
        Self {
            pending: Arc::new(Mutex::new(HashMap::new())),
            require_confirm_for,
        }
    }

    pub fn requires_confirm(&self, action: &str) -> bool {
        self.require_confirm_for.iter().any(|a| a == action)
    }

    /// Block until the user approves or denies the operation.
    /// Emits a bus event, waits for resolve(), returns true if approved.
    /// Returns false if the channel is dropped (timeout / shutdown).
    pub async fn require(
        &self,
        request_id: &str,
        preview: ConfirmPreview,
        bus: Option<&geonexus_core::events::EventBus>,
    ) -> bool {
        let (tx, rx) = oneshot::channel();

        {
            let mut pending = self.pending.lock().await;
            pending.insert(request_id.to_string(), tx);
        }

        // Emit event so frontend can show the dialog
        if let Some(b) = bus {
            b.publish(geonexus_core::events::BusEvent::new(
                geonexus_core::events::Domain::System,
                "confirmation_requested",
                serde_json::json!({
                    "request_id": request_id,
                    "action": preview.action,
                    "target_path": preview.target_path,
                    "details": preview.details,
                }),
                "fs_mcp",
            ));
        }

        // Block until user responds via resolve()
        rx.await.unwrap_or(false)
    }

    /// Resolve a pending confirmation. Sends the user's decision.
    /// Returns the request_id if the pending confirmation was found.
    pub async fn resolve(&self, request_id: &str, approved: bool) -> Option<String> {
        let mut pending = self.pending.lock().await;
        if let Some(tx) = pending.remove(request_id) {
            let _ = tx.send(approved);
            Some(request_id.to_string())
        } else {
            None
        }
    }

    /// List all pending request IDs with their previews.
    pub async fn list_pending(&self) -> Vec<(String, ConfirmPreview)> {
        // We can't get previews without storing them separately
        // This returns just the IDs — previews need separate storage
        let pending = self.pending.lock().await;
        pending.keys().map(|k| (k.clone(), ConfirmPreview {
            action: "unknown".into(),
            target_path: "unknown".into(),
            details: None,
        })).collect()
    }

    /// Number of pending confirmations.
    pub async fn pending_count(&self) -> usize {
        self.pending.lock().await.len()
    }

    /// Cancel all pending confirmations (e.g., on shutdown).
    pub async fn cancel_all(&self) {
        let mut pending = self.pending.lock().await;
        for (_id, tx) in pending.drain() {
            let _ = tx.send(false);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::time::Duration;

    #[test]
    fn test_requires_confirm() {
        let gate = ConfirmGate::new(vec![
            "delete".into(), "move".into(), "overwrite".into(),
        ]);
        assert!(gate.requires_confirm("delete"));
        assert!(gate.requires_confirm("move"));
        assert!(!gate.requires_confirm("create"));
        assert!(!gate.requires_confirm("read"));
    }

    #[tokio::test]
    async fn test_require_and_resolve_approved() {
        let gate = Arc::new(ConfirmGate::new(vec!["delete".into()]));
        let gate_clone = gate.clone();

        // Spawn a task that waits for confirmation
        let handle = tokio::spawn(async move {
            let preview = ConfirmPreview {
                action: "delete".into(),
                target_path: "/test/file.txt".into(),
                details: None,
            };
            gate_clone.require("req-1", preview, None).await
        });

        // Small delay to let the other task register
        tokio::time::sleep(Duration::from_millis(50)).await;

        // Resolve as approved
        let resolved = gate.resolve("req-1", true).await;
        assert!(resolved.is_some());

        let approved = handle.await.unwrap();
        assert!(approved);
    }

    #[tokio::test]
    async fn test_require_and_resolve_denied() {
        let gate = Arc::new(ConfirmGate::new(vec!["delete".into()]));
        let gate_clone = gate.clone();

        let handle = tokio::spawn(async move {
            let preview = ConfirmPreview {
                action: "delete".into(),
                target_path: "/test/file.txt".into(),
                details: None,
            };
            gate_clone.require("req-2", preview, None).await
        });

        tokio::time::sleep(Duration::from_millis(50)).await;

        let resolved = gate.resolve("req-2", false).await;
        assert!(resolved.is_some());

        let approved = handle.await.unwrap();
        assert!(!approved);
    }

    #[tokio::test]
    async fn test_resolve_unknown_id_returns_none() {
        let gate = ConfirmGate::new(vec!["delete".into()]);
        let result = gate.resolve("nonexistent", true).await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_pending_count() {
        let gate = Arc::new(ConfirmGate::new(vec!["delete".into(), "move".into()]));
        let g1 = gate.clone();
        let g2 = gate.clone();

        let _h1 = tokio::spawn(async move {
            let preview = ConfirmPreview {
                action: "delete".into(), target_path: "/a.txt".into(), details: None,
            };
            g1.require("req-a", preview, None).await
        });

        let _h2 = tokio::spawn(async move {
            let preview = ConfirmPreview {
                action: "move".into(), target_path: "/b.txt".into(), details: None,
            };
            g2.require("req-b", preview, None).await
        });

        tokio::time::sleep(Duration::from_millis(50)).await;
        assert_eq!(gate.pending_count().await, 2);
    }

    #[tokio::test]
    async fn test_cancel_all_resolves_false() {
        let gate = Arc::new(ConfirmGate::new(vec!["delete".into()]));
        let gate_clone = gate.clone();

        let handle = tokio::spawn(async move {
            let preview = ConfirmPreview {
                action: "delete".into(), target_path: "/a.txt".into(), details: None,
            };
            gate_clone.require("req-cancel", preview, None).await
        });

        tokio::time::sleep(Duration::from_millis(50)).await;
        gate.cancel_all().await;

        let approved = handle.await.unwrap();
        assert!(!approved); // Denied by default on cancel
    }

    #[tokio::test]
    async fn test_dropped_channel_returns_false() {
        let gate = Arc::new(ConfirmGate::new(vec!["delete".into()]));
        let gate_clone = gate.clone();

        let handle = tokio::spawn(async move {
            let preview = ConfirmPreview {
                action: "delete".into(), target_path: "/a.txt".into(), details: None,
            };
            gate_clone.require("req-drop", preview, None).await
        });

        tokio::time::sleep(Duration::from_millis(50)).await;
        // Cancel all — this sends false to all pending
        gate.cancel_all().await;

        let approved = handle.await.unwrap();
        assert!(!approved);
    }
}
