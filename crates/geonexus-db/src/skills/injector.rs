use crate::skills::registry::list_enabled_skills_for_injection;
use sqlx::SqlitePool;

/// Selecciona skills relevantes para un objetivo y devuelve sus contenidos.
pub async fn select_skills_for_goal(
    pool: &SqlitePool,
    goal: &str,
    max_skills: usize,
) -> Result<Vec<String>, String> {
    let skills = list_enabled_skills_for_injection(pool).await?;

    let mut scored: Vec<(f32, String)> = skills
        .into_iter()
        .filter_map(|(path, description, tags_json)| {
            let score = compute_relevance_score(goal, &description, &tags_json);
            if score > 0.0 {
                Some((score, path))
            } else {
                None
            }
        })
        .collect();

    scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    let skill_contents: Vec<String> = scored
        .into_iter()
        .take(max_skills)
        .filter_map(|(_, path)| std::fs::read_to_string(&path).ok())
        .collect();

    Ok(skill_contents)
}

/// Construye el contexto de skills para inyectar en el system prompt.
pub fn build_skills_context(skill_contents: &[String]) -> String {
    if skill_contents.is_empty() {
        return String::new();
    }
    format!(
        "## Skills activos\n\nSigue las instrucciones de estos skills:\n\n{}",
        skill_contents.join("\n\n---\n\n")
    )
}

fn compute_relevance_score(goal: &str, description: &str, tags_json: &str) -> f32 {
    let goal_lower = goal.to_lowercase();
    let tags: Vec<String> = serde_json::from_str(tags_json).unwrap_or_default();

    let mut score = 0.0_f32;

    // Palabras del description en el goal
    for word in description.split_whitespace() {
        if word.len() > 3 && goal_lower.contains(&word.to_lowercase()) {
            score += 1.0;
        }
    }

    // Tags exactos en el goal
    for tag in &tags {
        if goal_lower.contains(&tag.to_lowercase()) {
            score += 2.0;
        }
    }

    score
}
