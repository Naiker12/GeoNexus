use serde::{Deserialize, Serialize};
use std::path::Path;

/// Estructura principal de configuración
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoNexusConfig {
    #[serde(default)]
    pub mcp: McpConfig,
    #[serde(default)]
    pub skills: SkillsConfig,
    #[serde(default)]
    pub llm: LlmConfig,
    #[serde(default)]
    pub settings: SettingsConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpConfig {
    #[serde(default)]
    pub default_servers: Vec<McpServerDef>,
    #[serde(default = "default_ping_interval")]
    pub ping_interval_secs: u64,
}

fn default_ping_interval() -> u64 {
    60
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpServerDef {
    pub id: String,
    pub name: String,
    pub url: String,
    pub auth_type: Option<String>,
    pub auth_ref: Option<String>,
    pub auth_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillsConfig {
    #[serde(default = "default_true")]
    pub auto_install_builtins: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmConfig {
    #[serde(default = "default_model")]
    pub default_model: String,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
}

fn default_model() -> String {
    "gpt-4o".into()
}

fn default_max_tokens() -> u32 {
    4096
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsConfig {
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_language")]
    pub language: String,
}

fn default_theme() -> String {
    "dark".into()
}

fn default_language() -> String {
    "es-CO".into()
}

impl Default for McpConfig {
    fn default() -> Self {
        Self {
            default_servers: vec![],
            ping_interval_secs: 60,
        }
    }
}

impl Default for SkillsConfig {
    fn default() -> Self {
        Self {
            auto_install_builtins: true,
        }
    }
}

impl Default for LlmConfig {
    fn default() -> Self {
        Self {
            default_model: "gpt-4o".into(),
            max_tokens: 4096,
        }
    }
}

impl Default for SettingsConfig {
    fn default() -> Self {
        Self {
            theme: "dark".into(),
            language: "es-CO".into(),
        }
    }
}

impl Default for GeoNexusConfig {
    fn default() -> Self {
        Self {
            mcp: McpConfig::default(),
            skills: SkillsConfig::default(),
            llm: LlmConfig::default(),
            settings: SettingsConfig::default(),
        }
    }
}

/// Contenido por defecto del archivo geonexus.config.toml
pub const DEFAULT_CONFIG_TOML: &str = r##"# GeoNexus Configuration
# Este archivo se crea automáticamente si no existe.
# Puedes editarlo para personalizar los valores por defecto.

[mcp]
# Servidores MCP que se registran automáticamente al iniciar
default_servers = []
ping_interval_secs = 60

[skills]
auto_install_builtins = true

[llm]
default_model = "gpt-4o"
max_tokens = 4096

[settings]
theme = "dark"
language = "es-CO"
"##;

impl GeoNexusConfig {
    /// Carga la configuración desde un archivo TOML.
    /// Si el archivo no existe, crea uno con valores por defecto y lo retorna.
    pub fn load_or_create(path: &Path) -> Result<Self, String> {
        if path.exists() {
            let content = std::fs::read_to_string(path)
                .map_err(|e| format!("Error leyendo {path:?}: {e}"))?;
            toml::from_str(&content)
                .map_err(|e| format!("Error parseando {path:?}: {e}"))
        } else {
            let config = GeoNexusConfig::default();
            let content = toml::to_string_pretty(&config)
                .map_err(|e| format!("Error serializando config: {e}"))?;
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Error creando directorio {parent:?}: {e}"))?;
            }
            std::fs::write(path, &content)
                .map_err(|e| format!("Error escribiendo {path:?}: {e}"))?;
            Ok(config)
        }
    }

    /// Carga la configuración desde un path dado, con fallback a valores por defecto.
    pub fn load(path: &Path) -> Result<Self, String> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("Error leyendo {path:?}: {e}"))?;
        toml::from_str(&content)
            .map_err(|e| format!("Error parseando {path:?}: {e}"))
    }
}
