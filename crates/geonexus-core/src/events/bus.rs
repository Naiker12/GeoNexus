use tokio::sync::broadcast;
use crate::events::types::{BusEvent, GeoEvent, EventType};
use sqlx::SqlitePool;

const DEFAULT_CHANNEL_CAPACITY: usize = 1024;

#[derive(Clone)]
pub struct EventBus {
    sender: broadcast::Sender<GeoEvent>,
    db: SqlitePool,
    tx: broadcast::Sender<BusEvent>,
}

impl EventBus {
    pub fn new(db: SqlitePool) -> Self {
        let (sender, _) = broadcast::channel(DEFAULT_CHANNEL_CAPACITY);
        let (tx, _) = broadcast::channel(DEFAULT_CHANNEL_CAPACITY);
        Self { sender, db, tx }
    }

    pub async fn emit(&self, event: GeoEvent) {
        // 1. Broadcast a todos los listeners en memoria
        let _ = self.sender.send(event.clone());
        
        // 2. Persistir en SQLite (excepto LlmToken — muy frecuente)
        if !matches!(event.event_type, EventType::LlmToken) {
            self.persist(&event).await;
        }
    }
    
    pub fn subscribe(&self) -> broadcast::Receiver<GeoEvent> {
        self.sender.subscribe()
    }
    
    async fn persist(&self, event: &GeoEvent) {
        let event_type_str = serde_json::to_string(&event.event_type)
            .unwrap_or_default()
            .trim_matches('"')
            .to_string();

        let _ = sqlx::query(
            "INSERT INTO events (id, session_id, timestamp, event_type, payload) 
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&event.id)
        .bind(&event.session_id)
        .bind(event.timestamp)
        .bind(event_type_str)
        .bind(event.payload.to_string())
        .execute(&self.db)
        .await;
    }

    // Compatibility methods for BusEvent
    pub fn publish(&self, event: BusEvent) {
        let _ = self.tx.send(event);
    }

    pub fn subscribe_legacy(&self) -> broadcast::Receiver<BusEvent> {
        self.tx.subscribe()
    }

    pub fn sender(&self) -> broadcast::Sender<BusEvent> {
        self.tx.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::events::types::Domain;
    use sqlx::sqlite::SqlitePoolOptions;

    fn get_rt() -> tokio::runtime::Runtime {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
    }

    async fn test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();
        // Run migrations
        sqlx::migrate!("../geonexus-db/migrations").run(&pool).await.unwrap();
        pool
    }

    #[test]
    fn test_publish_subscribe_roundtrip() {
        let rt = get_rt();
        rt.block_on(async {
            let db = test_db().await;
            let bus = EventBus::new(db);
            let mut rx = bus.subscribe_legacy();

            let event = BusEvent::new(Domain::Chat, "ping", serde_json::json!({"key": "val"}), "test");
            let event_id = event.id.clone();

            bus.publish(event);

            let received = rx.recv().await.unwrap();
            assert_eq!(received.id, event_id);
            assert_eq!(received.domain, Domain::Chat);
            assert_eq!(received.action, "ping");
            assert_eq!(received.payload["key"], "val");
        });
    }

    #[test]
    fn test_multiple_subscribers() {
        let rt = get_rt();
        rt.block_on(async {
            let db = test_db().await;
            let bus = EventBus::new(db);
            let mut rx1 = bus.subscribe_legacy();
            let mut rx2 = bus.subscribe_legacy();

            let event = BusEvent::new(Domain::System, "test", serde_json::json!({}), "test");
            bus.publish(event);

            let _ = rx1.recv().await.unwrap();
            let _ = rx2.recv().await.unwrap();
        });
    }

    #[test]
    fn test_geo_emit_subscribe() {
        let rt = get_rt();
        rt.block_on(async {
            let db = test_db().await;
            let bus = EventBus::new(db);
            let mut rx = bus.subscribe();

            let event = GeoEvent {
                id: "geo-1".into(),
                session_id: "conv-123".into(),
                timestamp: 1000,
                event_type: EventType::PipelineStarted,
                payload: serde_json::json!({}),
            };

            bus.emit(event.clone()).await;

            let received = rx.recv().await.unwrap();
            assert_eq!(received.id, "geo-1");
            assert_eq!(received.session_id, "conv-123");
            assert!(matches!(received.event_type, EventType::PipelineStarted));
        });
    }
}


