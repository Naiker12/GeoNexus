use sqlx::{SqlitePool, Row};
use geonexus_core::events::{GeoEvent, EventType};

pub async fn insert_geo_event(pool: &SqlitePool, event: &GeoEvent) -> Result<(), sqlx::Error> {
    let event_type_str = serde_json::to_string(&event.event_type)
        .unwrap_or_default()
        .trim_matches('"')
        .to_string();

    sqlx::query(
        "INSERT INTO events (id, session_id, timestamp, event_type, payload) VALUES (?1, ?2, ?3, ?4, ?5)"
    )
    .bind(&event.id)
    .bind(&event.session_id)
    .bind(event.timestamp)
    .bind(event_type_str)
    .bind(event.payload.to_string())
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn list_geo_events(
    pool: &SqlitePool,
    session_id: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<GeoEvent>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, session_id, timestamp, event_type, payload FROM events WHERE session_id = ?1 ORDER BY timestamp ASC LIMIT ?2 OFFSET ?3"
    )
    .bind(session_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;


    let mut events = Vec::with_capacity(rows.len());
    for r in rows {
        let event_type_str: String = r.get("event_type");
        let payload_str: String = r.get("payload");
        
        let event_type_json = format!("\"{}\"", event_type_str);
        let event_type: EventType = serde_json::from_str(&event_type_json)
            .unwrap_or(EventType::PipelineFailed);

        events.push(GeoEvent {
            id: r.get("id"),
            session_id: r.get("session_id"),
            timestamp: r.get("timestamp"),
            event_type,
            payload: serde_json::from_str(&payload_str).unwrap_or_default(),
        });
    }
    Ok(events)
}
