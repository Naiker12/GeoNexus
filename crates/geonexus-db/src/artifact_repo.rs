use sqlx::{SqlitePool, Row};
use std::time::{SystemTime, UNIX_EPOCH};
use geonexus_core::events::{Artifact, ArtifactSummary};

fn now_unix() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() as i64
}

pub async fn insert_artifact(pool: &SqlitePool, a: &Artifact) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO artifacts (id, name, artifact_type, content, path, language, description, line_count, status, conversation_id, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)"
    )
    .bind(&a.id).bind(&a.name).bind(&a.artifact_type).bind(&a.content)
    .bind(&a.path).bind(&a.language).bind(&a.description)
    .bind(a.line_count).bind(&a.status).bind(&a.conversation_id)
    .bind(a.created_at).bind(a.updated_at)
    .execute(pool).await?;
    Ok(())
}

pub async fn update_artifact_content(
    pool: &SqlitePool,
    id: &str,
    content: &str,
    status: &str,
    line_count: i32,
) -> Result<(), sqlx::Error> {
    let now = now_unix();
    sqlx::query(
        "UPDATE artifacts SET content = ?1, status = ?2, line_count = ?3, updated_at = ?4 WHERE id = ?5"
    )
    .bind(content).bind(status).bind(line_count).bind(now).bind(id)
    .execute(pool).await?;
    Ok(())
}

fn row_to_artifact(r: &sqlx::sqlite::SqliteRow) -> Artifact {
    Artifact {
        id: r.get("id"),
        name: r.get("name"),
        artifact_type: r.get("artifact_type"),
        content: r.get("content"),
        path: r.get("path"),
        language: r.get("language"),
        description: r.get("description"),
        line_count: r.get("line_count"),
        status: r.get("status"),
        conversation_id: r.get("conversation_id"),
        created_at: r.get("created_at"),
        updated_at: r.get("updated_at"),
    }
}

fn row_to_summary(r: &sqlx::sqlite::SqliteRow) -> ArtifactSummary {
    ArtifactSummary {
        id: r.get("id"),
        name: r.get("name"),
        artifact_type: r.get("artifact_type"),
        path: r.get("path"),
        description: r.get("description"),
        line_count: r.get("line_count"),
        status: r.get("status"),
        created_at: r.get("created_at"),
    }
}

pub async fn list_artifacts(
    pool: &SqlitePool,
    conversation_id: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<Artifact>, sqlx::Error> {
    let rows = if let Some(cid) = conversation_id {
        sqlx::query(
            "SELECT id, name, artifact_type, content, path, language, description, line_count, status, conversation_id, created_at, updated_at FROM artifacts WHERE conversation_id = ?1 ORDER BY created_at DESC LIMIT ?2 OFFSET ?3"
        )
        .bind(cid).bind(limit).bind(offset).fetch_all(pool).await?
    } else {
        sqlx::query(
            "SELECT id, name, artifact_type, content, path, language, description, line_count, status, conversation_id, created_at, updated_at FROM artifacts ORDER BY created_at DESC LIMIT ?1 OFFSET ?2"
        )
        .bind(limit).bind(offset).fetch_all(pool).await?
    };
    Ok(rows.iter().map(|r| row_to_artifact(r)).collect())
}

pub async fn list_artifact_summaries(
    pool: &SqlitePool,
    conversation_id: Option<&str>,
) -> Result<Vec<ArtifactSummary>, sqlx::Error> {
    let rows = if let Some(cid) = conversation_id {
        sqlx::query(
            "SELECT id, name, artifact_type, path, description, line_count, status, created_at FROM artifacts WHERE conversation_id = ?1 ORDER BY created_at DESC"
        )
        .bind(cid).fetch_all(pool).await?
    } else {
        sqlx::query(
            "SELECT id, name, artifact_type, path, description, line_count, status, created_at FROM artifacts ORDER BY created_at DESC"
        ).fetch_all(pool).await?
    };
    Ok(rows.iter().map(|r| row_to_summary(r)).collect())
}

pub async fn get_artifact(pool: &SqlitePool, id: &str) -> Result<Option<Artifact>, sqlx::Error> {
    let rows = sqlx::query(
        "SELECT id, name, artifact_type, content, path, language, description, line_count, status, conversation_id, created_at, updated_at FROM artifacts WHERE id = ?1"
    )
    .bind(id).fetch_all(pool).await?;
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
        pool
    }

    fn test_artifact(id: &str) -> Artifact {
        Artifact {
            id: id.into(),
            name: "test.rs".into(),
            artifact_type: "code".into(),
            content: "fn main() {}".into(),
            path: "/src/test.rs".into(),
            language: Some("rust".into()),
            description: Some("A test file".into()),
            line_count: 1,
            status: "draft".into(),
            conversation_id: Some("conv-1".into()),
            created_at: 1000,
            updated_at: 1000,
        }
    }

    #[tokio::test]
    async fn test_insert_and_list_artifacts() {
        let pool = db().await;
        insert_artifact(&pool, &test_artifact("a1")).await.unwrap();
        insert_artifact(&pool, &test_artifact("a2")).await.unwrap();

        let all = list_artifacts(&pool, None, 10, 0).await.unwrap();
        assert_eq!(all.len(), 2);
    }

    #[tokio::test]
    async fn test_list_artifacts_by_conversation() {
        let pool = db().await;
        let mut a = test_artifact("a1");
        a.conversation_id = Some("conv-1".into());
        insert_artifact(&pool, &a).await.unwrap();

        let mut b = test_artifact("a2");
        b.conversation_id = Some("conv-2".into());
        insert_artifact(&pool, &b).await.unwrap();

        let conv1 = list_artifacts(&pool, Some("conv-1"), 10, 0).await.unwrap();
        assert_eq!(conv1.len(), 1);
        assert_eq!(conv1[0].id, "a1");
    }

    #[tokio::test]
    async fn test_list_artifact_summaries() {
        let pool = db().await;
        insert_artifact(&pool, &test_artifact("a1")).await.unwrap();

        let summaries = list_artifact_summaries(&pool, None).await.unwrap();
        assert_eq!(summaries.len(), 1);
        assert_eq!(summaries[0].id, "a1");
        assert_eq!(summaries[0].name, "test.rs");
        // summaries should not include content field
    }

    #[tokio::test]
    async fn test_get_artifact() {
        let pool = db().await;
        insert_artifact(&pool, &test_artifact("a1")).await.unwrap();

        let found = get_artifact(&pool, "a1").await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().content, "fn main() {}");

        let missing = get_artifact(&pool, "nonexistent").await.unwrap();
        assert!(missing.is_none());
    }

    #[tokio::test]
    async fn test_update_artifact_content() {
        let pool = db().await;
        insert_artifact(&pool, &test_artifact("a1")).await.unwrap();

        update_artifact_content(&pool, "a1", "fn updated() {}", "completed", 2).await.unwrap();

        let updated = get_artifact(&pool, "a1").await.unwrap().unwrap();
        assert_eq!(updated.content, "fn updated() {}");
        assert_eq!(updated.status, "completed");
        assert_eq!(updated.line_count, 2);
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

    #[tokio::test]
    async fn test_delete_nonexistent_returns_false() {
        let pool = db().await;
        let deleted = delete_artifact(&pool, "ghost").await.unwrap();
        assert!(!deleted);
    }
}
