use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfileEntry {
    pub id: String,
    pub key: String,
    pub value: String,
    pub category: String,
    pub confidence: f64,
    pub source: String,
    pub created_at: i64,
    pub updated_at: i64,
}

fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub async fn upsert_profile_entry(
    pool: &SqlitePool,
    key: &str,
    value: &str,
    category: &str,
    confidence: f64,
    source: &str,
) -> Result<UserProfileEntry, String> {
    let now = unix_now();

    let existing: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM user_profile WHERE key = ?"
    )
    .bind(key)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Error checking profile: {e}"))?;

    let id = if let Some((eid,)) = existing {
        sqlx::query(
            "UPDATE user_profile SET value = ?, category = ?, confidence = ?, updated_at = ? WHERE id = ?"
        )
        .bind(value)
        .bind(category)
        .bind(confidence)
        .bind(now)
        .bind(&eid)
        .execute(pool)
        .await
        .map_err(|e| format!("Error updating profile: {e}"))?;
        eid
    } else {
        let new_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO user_profile (id, key, value, category, confidence, source, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&new_id)
        .bind(key)
        .bind(value)
        .bind(category)
        .bind(confidence)
        .bind(source)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await
        .map_err(|e| format!("Error inserting profile: {e}"))?;
        new_id
    };

    get_profile_entry(pool, &id).await
}

pub async fn get_profile_entry(pool: &SqlitePool, id: &str) -> Result<UserProfileEntry, String> {
    sqlx::query("SELECT * FROM user_profile WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error fetching profile: {e}"))?
        .map(|row| {
            use sqlx::Row;
            UserProfileEntry {
                id: row.get("id"),
                key: row.get("key"),
                value: row.get("value"),
                category: row.get("category"),
                confidence: row.get("confidence"),
                source: row.get("source"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            }
        })
        .ok_or_else(|| format!("Profile entry {id} not found"))
}

pub async fn get_profile_by_key(pool: &SqlitePool, key: &str) -> Result<Option<UserProfileEntry>, String> {
    let row = sqlx::query("SELECT * FROM user_profile WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error fetching profile by key: {e}"))?;

    Ok(row.map(|r| {
        use sqlx::Row;
        UserProfileEntry {
            id: r.get("id"),
            key: r.get("key"),
            value: r.get("value"),
            category: r.get("category"),
            confidence: r.get("confidence"),
            source: r.get("source"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        }
    }))
}

pub async fn list_profile_entries(
    pool: &SqlitePool,
    category: Option<&str>,
    limit: i64,
) -> Result<Vec<UserProfileEntry>, String> {
    let rows = if let Some(cat) = category {
        sqlx::query(
            "SELECT * FROM user_profile WHERE category = ? ORDER BY updated_at DESC LIMIT ?"
        )
        .bind(cat)
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error listing profile: {e}"))?
    } else {
        sqlx::query(
            "SELECT * FROM user_profile ORDER BY updated_at DESC LIMIT ?"
        )
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error listing profile: {e}"))?
    };

    Ok(rows.into_iter().map(|row| {
        use sqlx::Row;
        UserProfileEntry {
            id: row.get("id"),
            key: row.get("key"),
            value: row.get("value"),
            category: row.get("category"),
            confidence: row.get("confidence"),
            source: row.get("source"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }
    }).collect())
}

pub async fn delete_profile_entry(pool: &SqlitePool, id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM user_profile WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error deleting profile: {e}"))?;
    Ok(())
}

pub async fn clear_all_profile_entries(pool: &SqlitePool) -> Result<(), String> {
    sqlx::query("DELETE FROM user_profile")
        .execute(pool)
        .await
        .map_err(|e| format!("Error clearing profile: {e}"))?;
    Ok(())
}
