use sha2::{Digest, Sha256};
use crate::skills::types::SkillFrontmatter;

/// Parsea el frontmatter YAML de un SKILL.md y devuelve el cuerpo.
pub fn parse_skill_md(content: &str) -> Result<(SkillFrontmatter, String), String> {
    let trimmed = content.trim();

    let parts: Vec<&str> = trimmed.splitn(3, "---").collect();

    if parts.len() < 3 {
        return Err("SKILL.md no tiene frontmatter válido (faltan delimitadores ---)".into());
    }

    let frontmatter_yaml = parts[1].trim();
    let body = parts[2].trim().to_string();

    if frontmatter_yaml.is_empty() {
        return Err("Frontmatter vacío".into());
    }

    let frontmatter: SkillFrontmatter = serde_yaml::from_str(frontmatter_yaml)
        .map_err(|e| format!("Frontmatter YAML inválido: {e}"))?;

    if frontmatter.name.trim().is_empty() {
        return Err("Frontmatter requiere campo 'name'".into());
    }

    Ok((frontmatter, body))
}

/// Computa SHA256 del contenido
pub fn compute_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}
