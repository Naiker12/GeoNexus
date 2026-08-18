use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatchProposal {
    pub id: String,
    pub project_id: String,
    pub conversation_id: String,
    pub file_path: String,
    pub original_content: Option<String>,
    pub proposed_content: String,
    pub diff: Option<String>,
    pub status: String, // pending, approved, rejected, applied
    pub created_at: i64,
    pub updated_at: i64,
}

fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn row_to_patch(row: &sqlx::sqlite::SqliteRow) -> PatchProposal {
    use sqlx::Row;
    PatchProposal {
        id: row.get("id"),
        project_id: row.get("project_id"),
        conversation_id: row.get("conversation_id"),
        file_path: row.get("file_path"),
        original_content: row.get("original_content"),
        proposed_content: row.get("proposed_content"),
        diff: row.get("diff"),
        status: row.get("status"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

pub async fn create_patch(
    pool: &SqlitePool,
    project_id: &str,
    conversation_id: &str,
    file_path: &str,
    original_content: Option<&str>,
    proposed_content: &str,
    diff: Option<&str>,
) -> Result<PatchProposal, String> {
    let now = unix_now();
    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO patch_proposals (id, project_id, conversation_id, file_path, original_content, proposed_content, diff, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)"
    )
    .bind(&id)
    .bind(project_id)
    .bind(conversation_id)
    .bind(file_path)
    .bind(original_content)
    .bind(proposed_content)
    .bind(diff)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await
    .map_err(|e| format!("Error creating patch: {e}"))?;

    get_patch(pool, &id).await
}

pub async fn get_patch(pool: &SqlitePool, id: &str) -> Result<PatchProposal, String> {
    sqlx::query("SELECT * FROM patch_proposals WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error getting patch: {e}"))?
        .map(|r| row_to_patch(&r))
        .ok_or_else(|| format!("Patch {id} not found"))
}

pub async fn list_patches(
    pool: &SqlitePool,
    project_id: &str,
    status: Option<&str>,
) -> Result<Vec<PatchProposal>, String> {
    let rows = if let Some(s) = status {
        sqlx::query(
            "SELECT * FROM patch_proposals WHERE project_id = ? AND status = ? ORDER BY created_at DESC"
        )
        .bind(project_id)
        .bind(s)
        .fetch_all(pool)
        .await
    } else {
        sqlx::query(
            "SELECT * FROM patch_proposals WHERE project_id = ? ORDER BY created_at DESC"
        )
        .bind(project_id)
        .fetch_all(pool)
        .await
    }
    .map_err(|e| format!("Error listing patches: {e}"))?;

    Ok(rows.into_iter().map(|r| row_to_patch(&r)).collect())
}

pub async fn update_patch_status(
    pool: &SqlitePool,
    id: &str,
    status: &str,
) -> Result<PatchProposal, String> {
    let now = unix_now();
    sqlx::query(
        "UPDATE patch_proposals SET status = ?, updated_at = ? WHERE id = ?"
    )
    .bind(status)
    .bind(now)
    .bind(id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error updating patch status: {e}"))?;
    get_patch(pool, id).await
}

pub async fn delete_patch(pool: &SqlitePool, id: &str) -> Result<(), String> {
    sqlx::query("DELETE FROM patch_proposals WHERE id = ?")
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error deleting patch: {e}"))?;
    Ok(())
}
