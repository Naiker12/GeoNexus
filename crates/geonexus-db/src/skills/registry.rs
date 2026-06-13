use sqlx::SqlitePool;
use std::path::PathBuf;

use crate::skills::{parser, types::*};

pub async fn list_skills(pool: &SqlitePool) -> Result<Vec<Skill>, String> {
    let rows = sqlx::query(
        "SELECT id, name, description, version, category, author,
                tags_json, mcp_servers_json, skill_md_path, skill_md_hash,
                source_url, enabled, builtin, use_count, last_used_at, installed_at, updated_at
         FROM skills ORDER BY builtin DESC, name ASC"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error listando skills: {e}"))?;

    let mut skills = Vec::new();
    for row in rows {
        skills.push(row_to_skill(&row)?);
    }
    Ok(skills)
}

pub async fn get_skill(pool: &SqlitePool, id: &str) -> Result<Option<Skill>, String> {
    let opt_row = sqlx::query(
        "SELECT id, name, description, version, category, author,
                tags_json, mcp_servers_json, skill_md_path, skill_md_hash,
                source_url, enabled, builtin, use_count, last_used_at, installed_at, updated_at
         FROM skills WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Error obteniendo skill {id}: {e}"))?;

    match opt_row {
        Some(row) => Ok(Some(row_to_skill(&row)?)),
        None => Ok(None),
    }
}

pub async fn install_from_file(
    pool: &SqlitePool,
    skill_md_path: &str,
    skills_dir: &PathBuf,
    source_url: Option<String>,
    now_ts: i64,
) -> Result<Skill, String> {
    let content = std::fs::read_to_string(skill_md_path)
        .map_err(|e| format!("Error leyendo {skill_md_path}: {e}"))?;

    let (frontmatter, _body) = parser::parse_skill_md(&content)?;
    let hash = parser::compute_hash(&content);

    // Directorio destino: skills_dir / name / SKILL.md
    let dest_dir = skills_dir.join(&frontmatter.name);
    std::fs::create_dir_all(&dest_dir)
        .map_err(|e| format!("Error creando directorio {dest_dir:?}: {e}"))?;

    let dest_path = dest_dir.join("SKILL.md");
    std::fs::copy(skill_md_path, &dest_path)
        .map_err(|e| format!("Error copiando a {dest_path:?}: {e}"))?;

    let dest_path_str = dest_path.to_string_lossy().to_string();
    let tags_json = serde_json::to_string(&frontmatter.tags.unwrap_or_default()).unwrap_or_default();
    let mcp_json = serde_json::to_string(&frontmatter.mcp_servers.unwrap_or_default()).unwrap_or_default();
    let category = frontmatter.category.unwrap_or_else(|| "gis".into());
    let version = frontmatter.version.unwrap_or_else(|| "1.0.0".into());

    sqlx::query(
        "INSERT INTO skills (id, name, description, version, category, author, tags_json,
                mcp_servers_json, skill_md_path, skill_md_hash, source_url, enabled, builtin,
                use_count, installed_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           version          = excluded.version,
           description      = excluded.description,
           category         = excluded.category,
           author           = excluded.author,
           tags_json        = excluded.tags_json,
           mcp_servers_json = excluded.mcp_servers_json,
           skill_md_path    = excluded.skill_md_path,
           skill_md_hash    = excluded.skill_md_hash,
           source_url       = excluded.source_url,
           updated_at       = excluded.updated_at"
    )
    .bind(&frontmatter.name)  // id = name
    .bind(&frontmatter.name)
    .bind(&frontmatter.description)
    .bind(&version)
    .bind(&category)
    .bind(&frontmatter.author)
    .bind(&tags_json)
    .bind(&mcp_json)
    .bind(&dest_path_str)
    .bind(&hash)
    .bind(&source_url)
    .bind(now_ts)  // installed_at
    .bind(now_ts)  // updated_at
    .execute(pool)
    .await
    .map_err(|e| format!("Error insertando skill: {e}"))?;

    get_skill(pool, &frontmatter.name)
        .await
        .map(|opt| opt.ok_or_else(|| "Skill insertado pero no encontrado".to_string()))?
}

pub async fn toggle_skill(pool: &SqlitePool, skill_id: &str, enabled: bool) -> Result<(), String> {
    let now_ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    sqlx::query("UPDATE skills SET enabled = ?, updated_at = ? WHERE id = ?")
        .bind(enabled as i32)
        .bind(now_ts)
        .bind(skill_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error toggling skill {skill_id}: {e}"))?;

    Ok(())
}

pub async fn read_skill_md(pool: &SqlitePool, skill_id: &str) -> Result<String, String> {
    let path: String = sqlx::query_scalar("SELECT skill_md_path FROM skills WHERE id = ?")
        .bind(skill_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error obteniendo path del skill {skill_id}: {e}"))?
        .ok_or_else(|| format!("Skill no encontrado: {skill_id}"))?;

    std::fs::read_to_string(&path).map_err(|e| format!("Error leyendo {path}: {e}"))
}

pub async fn record_activation(
    pool: &SqlitePool,
    skill_id: &str,
    conversation_id: Option<&str>,
    trigger: Option<&str>,
    now_ts: i64,
) -> Result<(), String> {
    let id = uuid::Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO skill_activations (id, skill_id, conversation_id, trigger, created_at)
         VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(skill_id)
    .bind(conversation_id)
    .bind(trigger)
    .bind(now_ts)
    .execute(pool)
    .await
    .map_err(|e| format!("Error insertando activación: {e}"))?;

    sqlx::query(
        "UPDATE skills SET use_count = use_count + 1, last_used_at = ? WHERE id = ?"
    )
    .bind(now_ts)
    .bind(skill_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Error actualizando use_count: {e}"))?;

    Ok(())
}

pub async fn list_enabled_skills_for_injection(pool: &SqlitePool) -> Result<Vec<(String, String, String)>, String> {
    let rows = sqlx::query(
        "SELECT s.skill_md_path, s.description, s.tags_json
         FROM skills s
         WHERE s.enabled = 1
         ORDER BY s.builtin DESC, s.use_count DESC"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error listando skills habilitados: {e}"))?;

    let mut out = Vec::new();
    for row in rows {
        use sqlx::Row;
        let path: String = row.get(0);
        let desc: Option<String> = row.get(1);
        let tags: Option<String> = row.get(2);
        out.push((path, desc.unwrap_or_default(), tags.unwrap_or_default()));
    }
    Ok(out)
}

fn row_to_skill(row: &sqlx::sqlite::SqliteRow) -> Result<Skill, String> {
    use sqlx::Row;
    let tags_str: Option<String> = row.get("tags_json");
    let mcp_str: Option<String> = row.get("mcp_servers_json");

    Ok(Skill {
        id: row.get("id"),
        name: row.get("name"),
        description: row.get("description"),
        version: row.get::<Option<String>, _>("version").unwrap_or_else(|| "1.0.0".into()),
        category: parse_category(row.get::<String, _>("category").as_str()),
        author: row.get("author"),
        tags: tags_str.and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default(),
        mcp_servers: mcp_str.and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default(),
        skill_md_path: row.get("skill_md_path"),
        skill_md_hash: row.get("skill_md_hash"),
        source_url: row.get("source_url"),
        enabled: row.get::<i32, _>("enabled") != 0,
        builtin: row.get::<i32, _>("builtin") != 0,
        use_count: row.get("use_count"),
        last_used_at: row.get("last_used_at"),
        installed_at: row.get("installed_at"),
        updated_at: row.get("updated_at"),
    })
}

pub fn parse_category(s: &str) -> SkillCategory {
    match s {
        "research" => SkillCategory::Research,
        "data" => SkillCategory::Data,
        "agent" => SkillCategory::Agent,
        "tool" => SkillCategory::Tool,
        "connector" => SkillCategory::Connector,
        _ => SkillCategory::Gis,
    }
}
