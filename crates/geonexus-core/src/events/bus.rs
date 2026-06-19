use tokio::sync::broadcast;
use crate::events::types::BusEvent;

const DEFAULT_CHANNEL_CAPACITY: usize = 1024;

#[derive(Clone)]
pub struct EventBus {
    tx: broadcast::Sender<BusEvent>,
}

impl EventBus {
    pub fn new(capacity: usize) -> Self {
        let (tx, _) = broadcast::channel(capacity);
        Self { tx }
    }

    pub fn publish(&self, event: BusEvent) {
        let _ = self.tx.send(event);
    }

    pub fn subscribe(&self) -> broadcast::Receiver<BusEvent> {
        self.tx.subscribe()
    }

    pub fn sender(&self) -> broadcast::Sender<BusEvent> {
        self.tx.clone()
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new(DEFAULT_CHANNEL_CAPACITY)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::events::types::{Domain, BusEvent};

    #[test]
    fn test_publish_subscribe_roundtrip() {
        let bus = EventBus::default();
        let mut rx = bus.subscribe();

        let event = BusEvent::new(Domain::Chat, "ping", serde_json::json!({"key": "val"}), "test");
        let event_id = event.id.clone();

        bus.publish(event);

        let received = rx.try_recv().unwrap();
        assert_eq!(received.id, event_id);
        assert_eq!(received.domain, Domain::Chat);
        assert_eq!(received.action, "ping");
        assert_eq!(received.payload["key"], "val");
    }

    #[test]
    fn test_multiple_subscribers() {
        let bus = EventBus::default();
        let mut rx1 = bus.subscribe();
        let mut rx2 = bus.subscribe();

        let event = BusEvent::new(Domain::System, "test", serde_json::json!({}), "test");
        bus.publish(event);

        let _ = rx1.try_recv().unwrap();
        let _ = rx2.try_recv().unwrap();
    }

    #[test]
    fn test_sender_clone() {
        let bus = EventBus::default();
        let tx = bus.sender();
        let mut rx = bus.subscribe();

        let event = BusEvent::new(Domain::Agent, "task", serde_json::json!({}), "test");
        tx.send(event.clone()).unwrap();

        let received = rx.try_recv().unwrap();
        assert_eq!(received.id, event.id);
    }

    #[test]
    fn test_default_capacity() {
        let bus: EventBus = Default::default();
        let event = BusEvent::new(Domain::System, "fill", serde_json::json!({}), "test");
        // Fill the buffer to test it handles capacity gracefully
        for _ in 0..1024 {
            bus.publish(BusEvent::new(Domain::System, "x", serde_json::json!({}), "t"));
        }
        bus.publish(event); // this should not panic
    }
}
