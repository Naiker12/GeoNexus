use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CuratedFact {
    pub id: String,
    pub fact: String,
    pub category: String,
    pub source: String,
    pub confidence: f64,
    pub created_at: i64,
    pub updated_at: i64,
    pub access_count: i64,
    pub tags: Vec<String>,
}

fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn row_to_fact(row: &sqlx::sqlite::SqliteRow) -> CuratedFact {
    use sqlx::Row;
    let tags_json: String = row.get("tags_json");
    CuratedFact {
        id: row.get("id"),
        fact: row.get("fact"),
        category: row.get("category"),
        source: row.get("source"),
        confidence: row.get("confidence"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
        access_count: row.get("access_count"),
        tags: serde_json::from_str(&tags_json).unwrap_or_default(),
    }
}

pub async fn add_fact(
    pool: &SqlitePool,
    fact: &str,
    category: &str,
    source: &str,
    confidence: f64,
    tags: &[String],
) -> Result<CuratedFact, String> {
    let now = unix_now();
    let fact_id = Uuid::new_v4().to_string();
    let tags_json = serde_json::to_string(tags).unwrap_or_else(|_| "[]".into());

    // Deduplicate by exact fact text
    let existing: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM curated_memory WHERE fact = ?"
    )
    .bind(fact)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Error checking duplicate fact: {e}"))?;

    let id = if let Some((eid,)) = existing {
        sqlx::query(
            "UPDATE curated_memory SET category = ?, confidence = ?, tags_json = ?, updated_at = ?, access_count = access_count + 1 WHERE id = ?"
        )
        .bind(category)
        .bind(confidence)
        .bind(&tags_json)
        .bind(now)
        .bind(&eid)
        .execute(pool)
        .await
        .map_err(|e| format!("Error updating fact: {e}"))?;
        eid
    } else {
        sqlx::query(
            "INSERT INTO curated_memory (id, fact, category, source, confidence, created_at, updated_at, tags_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&fact_id)
        .bind(fact)
        .bind(category)
        .bind(source)
        .bind(confidence)
        .bind(now)
        .bind(now)
        .bind(&tags_json)
        .execute(pool)
        .await
        .map_err(|e| format!("Error inserting fact: {e}"))?;
        fact_id
    };

    get_fact(pool, &id).await
}

pub async fn get_fact(pool: &SqlitePool, fact_id: &str) -> Result<CuratedFact, String> {
    sqlx::query("SELECT * FROM curated_memory WHERE id = ?")
        .bind(fact_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error fetching fact: {e}"))?
        .map(|row| row_to_fact(&row))
        .ok_or_else(|| format!("Fact {fact_id} not found"))
}

pub async fn search_facts(
    pool: &SqlitePool,
    query: &str,
    category: Option<&str>,
    min_confidence: f64,
    limit: i64,
) -> Result<Vec<CuratedFact>, String> {
    let rows = if let Some(cat) = category {
        sqlx::query(
            "SELECT * FROM curated_memory WHERE confidence >= ?1 AND category = ?2 AND (fact LIKE ?3 OR tags_json LIKE ?3) ORDER BY confidence DESC, updated_at DESC LIMIT ?4"
        )
        .bind(min_confidence)
        .bind(cat)
        .bind(format!("%{}%", query.trim()))
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error searching facts: {e}"))?
    } else if !query.trim().is_empty() {
        sqlx::query(
            "SELECT * FROM curated_memory WHERE confidence >= ?1 AND (fact LIKE ?2 OR tags_json LIKE ?2) ORDER BY confidence DESC, updated_at DESC LIMIT ?3"
        )
        .bind(min_confidence)
        .bind(format!("%{}%", query.trim()))
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error searching facts: {e}"))?
    } else {
        sqlx::query(
            "SELECT * FROM curated_memory WHERE confidence >= ?1 ORDER BY confidence DESC, updated_at DESC LIMIT ?2"
        )
        .bind(min_confidence)
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error listing facts: {e}"))?
    };

    Ok(rows.into_iter().map(|r| row_to_fact(&r)).collect())
}

pub async fn list_facts(
    pool: &SqlitePool,
    category: Option<&str>,
    limit: i64,
) -> Result<Vec<CuratedFact>, String> {
    if let Some(cat) = category {
        sqlx::query(
            "SELECT * FROM curated_memory WHERE category = ? ORDER BY updated_at DESC LIMIT ?"
        )
        .bind(cat)
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error listing facts: {e}"))?
    } else {
        sqlx::query(
            "SELECT * FROM curated_memory ORDER BY updated_at DESC LIMIT ?"
        )
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error listing facts: {e}"))?
    }
    .into_iter()
    .map(|r| Ok(row_to_fact(&r)))
    .collect()
}

pub async fn update_fact(
    pool: &SqlitePool,
    fact_id: &str,
    fact: Option<&str>,
    category: Option<&str>,
    confidence: Option<f64>,
    tags: Option<&[String]>,
) -> Result<CuratedFact, String> {
    let now = unix_now();
    let mut sets = vec!["updated_at = ?".to_string()];
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Sqlite> + Send>> =
        vec![Box::new(now)];

    if let Some(f) = fact {
        sets.push("fact = ?".to_string());
        params.push(Box::new(f.to_string()));
    }
    if let Some(c) = category {
        sets.push("category = ?".to_string());
        params.push(Box::new(c.to_string()));
    }
    if let Some(c) = confidence {
        sets.push("confidence = ?".to_string());
        params.push(Box::new(c));
    }
    if let Some(t) = tags {
        let tj = serde_json::to_string(t).unwrap_or_else(|_| "[]".into());
        sets.push("tags_json = ?".to_string());
        params.push(Box::new(tj));
    }

    // Fallback to simpler update without dynamic query builder
    let fact_row = get_fact(pool, fact_id).await?;
    let new_fact = fact.unwrap_or(&fact_row.fact).to_string();
    let new_cat = category.unwrap_or(&fact_row.category).to_string();
    let new_conf = confidence.unwrap_or(fact_row.confidence);
    let new_tags = tags.map(|t| t.to_vec()).unwrap_or(fact_row.tags);
    let new_tags_json = serde_json::to_string(&new_tags).unwrap_or_else(|_| "[]".into());

    sqlx::query(
        "UPDATE curated_memory SET fact = ?, category = ?, confidence = ?, tags_json = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&new_fact)
    .bind(&new_cat)
    .bind(new_conf)
    .bind(&new_tags_json)
    .bind(now)
    .bind(fact_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error updating fact: {e}"))?;

    get_fact(pool, fact_id).await
}

pub async fn delete_fact(pool: &SqlitePool, fact_id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM curated_memory WHERE id = ?")
        .bind(fact_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error deleting fact: {e}"))?;
    Ok(())
}

pub async fn increment_access(pool: &SqlitePool, fact_id: &str) -> Result<(), String> {
    sqlx::query("UPDATE curated_memory SET access_count = access_count + 1 WHERE id = ?")
        .bind(fact_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error incrementing access: {e}"))?;
    Ok(())
}
