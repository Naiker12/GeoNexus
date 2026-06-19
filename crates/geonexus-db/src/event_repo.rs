use sqlx::{SqlitePool, Row};
use geonexus_core::events::{BusEvent, Domain};

pub async fn insert_event(pool: &SqlitePool, event: &BusEvent) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO events (id, domain, action, payload, source, timestamp, conversation_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    )
    .bind(&event.id)
    .bind(event.domain.as_str())
    .bind(&event.action)
    .bind(event.payload.to_string())
    .bind(&event.source)
    .bind(event.timestamp)
    .bind(&event.conversation_id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn list_events(
    pool: &SqlitePool,
    domain: Option<&str>,
    conversation_id: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<BusEvent>, sqlx::Error> {
    let (sql, bind_value): (&str, Option<&str>) = if let Some(d) = domain {
        ("SELECT id, domain, action, payload, source, timestamp, conversation_id FROM events WHERE domain = ?1 ORDER BY timestamp DESC LIMIT ?2 OFFSET ?3", Some(d))
    } else if let Some(cid) = conversation_id {
        ("SELECT id, domain, action, payload, source, timestamp, conversation_id FROM events WHERE conversation_id = ?1 ORDER BY timestamp DESC LIMIT ?2 OFFSET ?3", Some(cid))
    } else {
        ("SELECT id, domain, action, payload, source, timestamp, conversation_id FROM events ORDER BY timestamp DESC LIMIT ?1 OFFSET ?2", None)
    };

    let rows = if let Some(val) = bind_value {
        sqlx::query(sql).bind(val).bind(limit).bind(offset).fetch_all(pool).await?
    } else {
        sqlx::query(sql).bind(limit).bind(offset).fetch_all(pool).await?
    };

    let mut events = Vec::with_capacity(rows.len());
    for r in rows {
        let domain_str: String = r.get("domain");
        let payload_str: String = r.get("payload");
        events.push(BusEvent {
            id: r.get("id"),
            domain: Domain::from_str(&domain_str).unwrap_or(Domain::System),
            action: r.get("action"),
            payload: serde_json::from_str(&payload_str).unwrap_or_default(),
            source: r.get("source"),
            timestamp: r.get("timestamp"),
            conversation_id: r.get("conversation_id"),
        });
    }
    Ok(events)
}

pub async fn count_events(pool: &SqlitePool, domain: Option<&str>, conversation_id: Option<&str>) -> Result<i64, sqlx::Error> {
    let row = if let Some(d) = domain {
        sqlx::query("SELECT COUNT(*) as cnt FROM events WHERE domain = ?1").bind(d).fetch_one(pool).await?
    } else if let Some(cid) = conversation_id {
        sqlx::query("SELECT COUNT(*) as cnt FROM events WHERE conversation_id = ?1").bind(cid).fetch_one(pool).await?
    } else {
        sqlx::query("SELECT COUNT(*) as cnt FROM events").fetch_one(pool).await?
    };
    Ok(row.get("cnt"))
}

pub async fn delete_old_events(pool: &SqlitePool, older_than_unix: i64) -> Result<u64, sqlx::Error> {
    let result = sqlx::query("DELETE FROM events WHERE timestamp < ?1")
        .bind(older_than_unix)
        .execute(pool).await?;
    Ok(result.rows_affected())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    fn test_event(domain: &str) -> BusEvent {
        BusEvent::new(
            Domain::from_str(domain).unwrap_or(Domain::System),
            "test",
            serde_json::json!({"msg": "hello"}),
            "test_suite",
        )
    }

    #[tokio::test]
    async fn test_insert_and_list_events() {
        let pool = db().await;
        let event = test_event("chat");
        insert_event(&pool, &event).await.unwrap();

        let events = list_events(&pool, None, None, 10, 0).await.unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].action, "test");
        assert_eq!(events[0].domain, Domain::Chat);
    }

    #[tokio::test]
    async fn test_list_events_filter_by_domain() {
        let pool = db().await;
        insert_event(&pool, &test_event("chat")).await.unwrap();
        insert_event(&pool, &test_event("agent")).await.unwrap();
        insert_event(&pool, &test_event("chat")).await.unwrap();

        let chat_events = list_events(&pool, Some("chat"), None, 10, 0).await.unwrap();
        assert_eq!(chat_events.len(), 2);

        let agent_events = list_events(&pool, Some("agent"), None, 10, 0).await.unwrap();
        assert_eq!(agent_events.len(), 1);
    }

    #[tokio::test]
    async fn test_list_events_filter_by_conversation() {
        let pool = db().await;
        let mut e = test_event("chat");
        e.conversation_id = Some("conv-1".into());
        insert_event(&pool, &e).await.unwrap();

        let mut e2 = test_event("agent");
        e2.conversation_id = Some("conv-2".into());
        insert_event(&pool, &e2).await.unwrap();

        let conv_events = list_events(&pool, None, Some("conv-1"), 10, 0).await.unwrap();
        assert_eq!(conv_events.len(), 1);
        assert_eq!(conv_events[0].domain, Domain::Chat);
    }

    #[tokio::test]
    async fn test_count_events() {
        let pool = db().await;
        insert_event(&pool, &test_event("chat")).await.unwrap();
        insert_event(&pool, &test_event("chat")).await.unwrap();
        insert_event(&pool, &test_event("agent")).await.unwrap();

        assert_eq!(count_events(&pool, None, None).await.unwrap(), 3);
        assert_eq!(count_events(&pool, Some("chat"), None).await.unwrap(), 2);
    }

    #[tokio::test]
    async fn test_delete_old_events() {
        let pool = db().await;
        let mut old = test_event("chat");
        old.timestamp = 1000;
        let mut recent = test_event("chat");
        recent.timestamp = 9999999999;

        insert_event(&pool, &old).await.unwrap();
        insert_event(&pool, &recent).await.unwrap();

        let deleted = delete_old_events(&pool, 5000).await.unwrap();
        assert_eq!(deleted, 1);

        let remaining = list_events(&pool, None, None, 10, 0).await.unwrap();
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].timestamp, 9999999999);
    }

    #[tokio::test]
    async fn test_pagination() {
        let pool = db().await;
        for _ in 0..5 {
            insert_event(&pool, &test_event("chat")).await.unwrap();
        }

        let page1 = list_events(&pool, None, None, 2, 0).await.unwrap();
        assert_eq!(page1.len(), 2);

        let page2 = list_events(&pool, None, None, 2, 2).await.unwrap();
        assert_eq!(page2.len(), 2);
    }
}
