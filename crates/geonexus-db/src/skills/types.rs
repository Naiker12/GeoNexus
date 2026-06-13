use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub version: String,
    pub category: SkillCategory,
    pub author: Option<String>,
    pub tags: Vec<String>,
    pub mcp_servers: Vec<String>,
    pub skill_md_path: String,
    pub skill_md_hash: Option<String>,
    pub source_url: Option<String>,
    pub enabled: bool,
    pub builtin: bool,
    pub use_count: i32,
    pub last_used_at: Option<i64>,
    pub installed_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SkillCategory {
    Gis,
    Research,
    Data,
    Agent,
    Tool,
    Connector,
}

impl SkillCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Gis => "gis",
            Self::Research => "research",
            Self::Data => "data",
            Self::Agent => "agent",
            Self::Tool => "tool",
            Self::Connector => "connector",
        }
    }
}

/// Frontmatter YAML parseado de un SKILL.md
#[derive(Debug, Deserialize)]
pub struct SkillFrontmatter {
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub category: Option<String>,
    pub author: Option<String>,
    pub tags: Option<Vec<String>>,
    #[serde(rename = "mcp-servers")]
    pub mcp_servers: Option<Vec<String>>,
    #[serde(rename = "source-url")]
    pub source_url: Option<String>,
}

/// Payload recibido del frontend para instalar un skill
#[derive(Debug, Deserialize)]
pub struct InstallSkillPayload {
    pub source: InstallSource,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum InstallSource {
    Github { url: String },
    File { path: String },
}
