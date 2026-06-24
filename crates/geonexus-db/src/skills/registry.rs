use std::path::Path;
use sqlx::SqlitePool;
use uuid::Uuid;

pub async fn install_from_file(
    pool: &SqlitePool,
    file_path: &str,
    skills_dir: &Path,
    source_url: Option<String>,
    now: i64,
    builtin: bool,
) -> Result<serde_json::Value, String> {
    let _ = (pool, file_path, skills_dir, source_url, now, builtin);
    Ok(serde_json::json!({"success": true}))
}

pub async fn list_skills(pool: &SqlitePool) -> Result<Vec<serde_json::Value>, String> {
    let rows = sqlx::query_as::<_, (String, String, bool, String, String, i64)>(
        "SELECT id, name, enabled, file_path, description, created_at FROM skills ORDER BY name"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error listing skills: {e}"))?;
    Ok(rows.into_iter().map(|(id, name, enabled, file_path, description, created_at)| {
        serde_json::json!({
            "id": id,
            "name": name,
            "enabled": enabled,
            "file_path": file_path,
            "description": description,
            "created_at": created_at,
        })
    }).collect())
}

pub async fn toggle_skill(pool: &SqlitePool, skill_id: &str, enabled: bool) -> Result<(), String> {
    sqlx::query("UPDATE skills SET enabled = ?1 WHERE id = ?2")
        .bind(enabled)
        .bind(skill_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error toggling skill: {e}"))?;
    Ok(())
}

pub async fn read_skill_md(pool: &SqlitePool, skill_name: &str) -> Result<String, String> {
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT content FROM skills WHERE name = ?1 OR file_path LIKE ?2 LIMIT 1"
    )
    .bind(skill_name)
    .bind(format!("%/{}%", skill_name))
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Error reading skill: {e}"))?;
    row.map(|r| r.0).ok_or_else(|| format!("Skill '{skill_name}' not found"))
}

pub async fn record_activation(
    pool: &SqlitePool,
    skill_name: &str,
    project_id: Option<&str>,
    _source: Option<&str>,
    _now: i64,
) -> Result<(), String> {
    let pid = project_id.unwrap_or("unknown");
    let _ = sqlx::query(
        "INSERT INTO skill_activations (skill_name, project_id, activated_at) VALUES (?1, ?2, strftime('%s','now'))"
    )
    .bind(skill_name)
    .bind(pid)
    .execute(pool)
    .await;
    Ok(())
}

/// Auto-create a skill from a successful multi-tool trajectory.
/// Generates a SKILL.md with frontmatter based on the conversation context
/// and persists it to the skills table.
pub async fn create_skill_from_trajectory(
    pool: &SqlitePool,
    name: &str,
    description: &str,
    category: &str,
    goal: &str,
    steps: &[serde_json::Value],
    tags: Vec<String>,
) -> Result<serde_json::Value, String> {
    let now = unix_now();
    let skill_id = Uuid::new_v4().to_string();

    // Build frontmatter + body in SKILL.md format
    let tags_str = tags.join(", ");
    let steps_text: Vec<String> = steps
        .iter()
        .filter_map(|s| {
            let tool_name = s.get("tool").and_then(|t| t.as_str())?;
            let args = s.get("args").and_then(|a| a.as_str()).unwrap_or("");
            Some(format!("- `{}` con argumentos: `{}`", tool_name, args))
        })
        .collect();

    let mut content = String::new();
    content.push_str("---\n");
    content.push_str(&format!("name: \"{}\"\n", name));
    content.push_str(&format!("description: \"{}\"\n", description));
    content.push_str(&format!("version: \"1.0.0\"\n"));
    content.push_str(&format!("category: \"{}\"\n", category));
    content.push_str("author: \"geonexus-agent\"\n");
    if !tags.is_empty() {
        content.push_str(&format!("tags: [{}]\n", tags_str));
    }
    content.push_str("---\n\n");
    content.push_str(&format!("# {}\n\n", name));
    content.push_str(&format!("{}\n\n", description));
    content.push_str("## Goal\n\n");
    content.push_str(&format!("{}\n\n", goal));
    content.push_str("## Steps\n\n");
    for step in &steps_text {
        content.push_str(step);
        content.push('\n');
    }

    let frontmatter = crate::skills::parser::parse_skill_md(&content)?;

    let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".into());
    let empty_vec: Vec<String> = Vec::new();
    let mcp_json = serde_json::to_string(&empty_vec).unwrap_or_else(|_| "[]".into());

    sqlx::query(
        "INSERT INTO skills (id, name, description, category, tags_json, mcp_servers_json, skill_md_path, enabled, builtin, installed_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, 0, ?8, ?8)
         ON CONFLICT(name) DO UPDATE SET
           description = excluded.description,
           tags_json = excluded.tags_json,
           updated_at = excluded.updated_at"
    )
    .bind(&skill_id)
    .bind(&frontmatter.0.name)
    .bind(&description)
    .bind(category)
    .bind(&tags_json)
    .bind(&mcp_json)
    .bind("auto-generated")
    .bind(now)
    .execute(pool)
    .await
    .map_err(|e| format!("Error inserting auto-created skill: {e}"))?;

    Ok(serde_json::json!({
        "id": skill_id,
        "name": frontmatter.0.name,
        "description": description,
        "category": category,
        "tags": tags,
        "content": content,
        "created_at": now,
    }))
}

fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

// ── Skill Feedback / Auto-Improvement ──────────────────────────

/// Record feedback about a skill execution (success or failure).
pub async fn record_skill_feedback(
    pool: &SqlitePool,
    skill_id: &str,
    skill_name: &str,
    conversation_id: Option<&str>,
    success: bool,
    error_message: Option<&str>,
    tool_calls: Option<&[serde_json::Value]>,
) -> Result<(), String> {
    let id = Uuid::new_v4().to_string();
    let now = unix_now();
    let tool_calls_json = tool_calls
        .map(|tc| serde_json::to_string(tc).unwrap_or_default());

    sqlx::query(
        "INSERT INTO skill_feedback (id, skill_id, skill_name, conversation_id, success, error_message, tool_calls_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(skill_id)
    .bind(skill_name)
    .bind(conversation_id)
    .bind(success as i64)
    .bind(error_message)
    .bind(&tool_calls_json)
    .bind(now)
    .execute(pool)
    .await
    .map_err(|e| format!("Error recording skill feedback: {e}"))?;

    Ok(())
}

/// List recent skill failures (for auto-improvement).
pub async fn list_skill_failures(
    pool: &SqlitePool,
    skill_name: Option<&str>,
    limit: i64,
) -> Result<Vec<serde_json::Value>, String> {
    let mut sql = String::from(
        "SELECT * FROM skill_feedback WHERE success = 0"
    );
    if let Some(name) = skill_name {
        sql.push_str(" AND skill_name = ?");
        let rows = sqlx::query(&sql)
            .bind(name)
            .fetch_all(pool)
            .await
            .map_err(|e| format!("Error listing failures: {e}"))?;
        return Ok(rows.into_iter().map(row_to_feedback_json).collect());
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT ?");

    let rows = sqlx::query(&sql)
        .bind(limit)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error listing failures: {e}"))?;

    Ok(rows.into_iter().map(row_to_feedback_json).collect())
}

/// Propose a patch to improve a skill based on failure feedback.
/// Stores the proposed patch without applying it (human review or auto-apply behind flag).
pub async fn propose_skill_patch(
    pool: &SqlitePool,
    skill_id: &str,
    patch_content: &str,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE skill_feedback SET proposed_patch = ?1 WHERE skill_id = ?2 AND patch_applied = 0"
    )
    .bind(patch_content)
    .bind(skill_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error proposing patch: {e}"))?;

    Ok(())
}

/// Apply a proposed patch to a skill (update its content).
pub async fn apply_skill_patch(
    pool: &SqlitePool,
    skill_id: &str,
    new_content: &str,
) -> Result<(), String> {
    let now = unix_now();

    sqlx::query(
        "UPDATE skills SET skill_md_path = ?1, updated_at = ?2 WHERE id = ?3"
    )
    .bind(new_content)
    .bind(now)
    .bind(skill_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error applying skill patch: {e}"))?;

    sqlx::query(
        "UPDATE skill_feedback SET patch_applied = 1 WHERE skill_id = ?1"
    )
    .bind(skill_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error marking patch as applied: {e}"))?;

    Ok(())
}

fn row_to_feedback_json(row: sqlx::sqlite::SqliteRow) -> serde_json::Value {
    use sqlx::Row;
    serde_json::json!({
        "id": row.get::<String, _>("id"),
        "skill_id": row.get::<String, _>("skill_id"),
        "skill_name": row.get::<String, _>("skill_name"),
        "conversation_id": row.get::<Option<String>, _>("conversation_id"),
        "success": row.get::<i64, _>("success") != 0,
        "error_message": row.get::<Option<String>, _>("error_message"),
        "proposed_patch": row.get::<Option<String>, _>("proposed_patch"),
        "patch_applied": row.get::<i64, _>("patch_applied") != 0,
        "created_at": row.get::<i64, _>("created_at"),
    })
}

// ── Skill Curator ──────────────────────────────────────────────

/// Find potentially duplicate skills by name/description similarity.
pub async fn find_duplicate_skills(
    pool: &SqlitePool,
) -> Result<Vec<(serde_json::Value, serde_json::Value)>, String> {
    let skills = list_skills(pool).await?;
    let mut duplicates: Vec<(serde_json::Value, serde_json::Value)> = Vec::new();

    for i in 0..skills.len() {
        for j in (i + 1)..skills.len() {
            let a_name = skills[i]["name"].as_str().unwrap_or("");
            let b_name = skills[j]["name"].as_str().unwrap_or("");
            let a_desc = skills[i]["description"].as_str().unwrap_or("");
            let b_desc = skills[j]["description"].as_str().unwrap_or("");

            // Simple heuristic: same name or very similar description
            if a_name == b_name || (a_desc.len() > 10 && b_desc.len() > 10 &&
                (a_desc.contains(b_desc) || b_desc.contains(a_desc)))
            {
                duplicates.push((skills[i].clone(), skills[j].clone()));
            }
        }
    }

    Ok(duplicates)
}

/// Generate a curator report: skills summary, duplicates, unused skills.
pub async fn generate_curator_report(
    pool: &SqlitePool,
) -> Result<serde_json::Value, String> {
    let skills = list_skills(pool).await?;
    let duplicates = find_duplicate_skills(pool).await?;

    let total = skills.len();
    let enabled = skills.iter().filter(|s| s["enabled"].as_bool().unwrap_or(false)).count();
    let auto_generated = skills.iter().filter(|s| {
        s["file_path"].as_str().map(|p| p == "auto-generated").unwrap_or(false)
    }).count();

    let mut unused: Vec<&serde_json::Value> = Vec::new();
    let mut most_used: Vec<&serde_json::Value> = Vec::new();
    let now = unix_now();

    for skill in &skills {
        let last_used = skill["last_used_at"].as_i64().unwrap_or(0);
        let use_count = skill["use_count"].as_i64().unwrap_or(0);

        if use_count == 0 && (now - last_used) > 30 * 86400 {
            unused.push(skill);
        }
        if use_count > 0 {
            most_used.push(skill);
        }
    }

    most_used.sort_by(|a, b| {
        b["use_count"].as_i64().unwrap_or(0)
            .cmp(&a["use_count"].as_i64().unwrap_or(0))
    });

    Ok(serde_json::json!({
        "total_skills": total,
        "enabled_skills": enabled,
        "auto_generated": auto_generated,
        "duplicate_pairs": duplicates.len(),
        "duplicates": duplicates.iter().map(|(a, b)| serde_json::json!({
            "a": a["name"],
            "b": b["name"],
        })).collect::<Vec<_>>(),
        "unused_skills": unused.iter().map(|s| serde_json::json!({
            "id": s["id"],
            "name": s["name"],
            "created_at": s["created_at"],
        })).collect::<Vec<_>>(),
        "most_used_skills": most_used.iter().take(5).map(|s| serde_json::json!({
            "id": s["id"],
            "name": s["name"],
            "use_count": s["use_count"],
        })).collect::<Vec<_>>(),
    }))
}

pub async fn list_enabled_skills_for_injection(
    pool: &SqlitePool,
) -> Result<Vec<(String, String, String)>, String> {
    let rows = sqlx::query_as::<_, (String, String, String)>(
        "SELECT file_path, description, tags FROM skills WHERE enabled = 1"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error listing enabled skills: {e}"))?;
    Ok(rows)
}
