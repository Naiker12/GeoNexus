use sqlx::{SqlitePool, Row};
use geonexus_core::events::{Artifact, ArtifactType};

pub async fn insert_artifact(pool: &SqlitePool, a: &Artifact) -> Result<(), sqlx::Error> {
    let type_str = serde_json::to_string(&a.artifact_type)
        .unwrap_or_default()
        .trim_matches('"')
        .to_string();

    sqlx::query(
        "INSERT INTO artifacts (id, session_id, name, artifact_type, path, content, metadata, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
    )
    .bind(&a.id)
    .bind(&a.session_id)
    .bind(&a.name)
    .bind(type_str)
    .bind(&a.path)
    .bind(&a.content)
    .bind(a.metadata.to_string())
    .bind(a.created_at)
    .execute(pool)
    .await?;
    Ok(())
}

fn row_to_artifact(r: &sqlx::sqlite::SqliteRow) -> Artifact {
    let type_str: String = r.get("artifact_type");
    let type_json = format!("\"{}\"", type_str);
    let artifact_type: ArtifactType = serde_json::from_str(&type_json)
        .unwrap_or(ArtifactType::Code);

    let metadata_str: String = r.get("metadata");
    let metadata: serde_json::Value = serde_json::from_str(&metadata_str)
        .unwrap_or_default();

    Artifact {
        id: r.get("id"),
        session_id: r.get("session_id"),
        name: r.get("name"),
        artifact_type,
        path: r.get("path"),
        content: r.get("content"),
        metadata,
        created_at: r.get("created_at"),
    }
}

pub async fn list_artifacts(
    pool: &SqlitePool,
    session_id: &str,
    limit: i64,
    offset: i64,
) -> Result<Vec<Artifact>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, session_id, name, artifact_type, path, content, metadata, created_at FROM artifacts WHERE session_id = ?1 ORDER BY created_at DESC LIMIT ?2 OFFSET ?3"
    )
    .bind(session_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;
    
    Ok(rows.iter().map(|r| row_to_artifact(r)).collect())
}

pub async fn get_artifact(pool: &SqlitePool, id: &str) -> Result<Option<Artifact>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, session_id, name, artifact_type, path, content, metadata, created_at FROM artifacts WHERE id = ?1"
    )
    .bind(id)
    .fetch_all(pool)
    .await?;
    Ok(rows.first().map(|r| row_to_artifact(r)))
}

pub async fn delete_artifact(pool: &SqlitePool, id: &str) -> Result<bool, sqlx::Error> {
    let result = sqlx::query("DELETE FROM artifacts WHERE id = ?1").bind(id).execute(pool).await?;
    Ok(result.rows_affected() > 0)
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
        // Insert a dummy conversation to satisfy foreign key constraints for session_id
        let _ = sqlx::query("INSERT INTO conversations (id, project_id, title, created_at, updated_at) VALUES ('conv-1', 'proj-1', 'Test Session', 0, 0)")
            .execute(&pool)
            .await;
        pool
    }

    fn test_artifact(id: &str) -> Artifact {
        Artifact {
            id: id.into(),
            session_id: "conv-1".into(),
            name: "test.rs".into(),
            artifact_type: ArtifactType::Code,
            content: Some("fn main() {}".into()),
            path: Some("/src/test.rs".into()),
            metadata: serde_json::json!({ "language": "rust" }),
            created_at: 1000,
        }
    }

    #[tokio::test]
    async fn test_insert_and_list_artifacts() {
        let pool = db().await;
        insert_artifact(&pool, &test_artifact("a1")).await.unwrap();
        insert_artifact(&pool, &test_artifact("a2")).await.unwrap();

        let all = list_artifacts(&pool, "conv-1", 10, 0).await.unwrap();
        assert_eq!(all.len(), 2);
    }

    #[tokio::test]
    async fn test_get_artifact() {
        let pool = db().await;
        insert_artifact(&pool, &test_artifact("a1")).await.unwrap();

        let found = get_artifact(&pool, "a1").await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().content, Some("fn main() {}".into()));

        let missing = get_artifact(&pool, "nonexistent").await.unwrap();
        assert!(missing.is_none());
    }

    #[tokio::test]
    async fn test_delete_artifact() {
        let pool = db().await;
        insert_artifact(&pool, &test_artifact("a1")).await.unwrap();

        let deleted = delete_artifact(&pool, "a1").await.unwrap();
        assert!(deleted);

        let missing = get_artifact(&pool, "a1").await.unwrap();
        assert!(missing.is_none());
    }
}

