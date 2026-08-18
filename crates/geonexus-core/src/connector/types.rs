use serde::{Deserialize, Serialize};

/// Proveedor de conector soportado.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConnectorProvider {
    Local,
    OneDrive,
    SharePoint,
    GoogleDrive,
    Dropbox,
    S3,
}

/// Estado de sincronización de un archivo individual.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FileSyncStatus {
    Pending,
    Synced,
    Conflict,
    Ignored,
}

/// Configuración de un conector registrado en el proyecto.
/// Sin secretos — los tokens van al keychain.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectorConfig {
    pub id: String,
    pub project_id: String,
    pub workspace_id: Option<String>,
    pub provider: ConnectorProvider,
    pub display_name: String,
    pub root_path: Option<String>,     // Solo para Local
    pub qgis_project_path: Option<String>,
    pub base_url: Option<String>,      // SharePoint local, S3 personalizado
    pub client_id: Option<String>,     // Registro de aplicación (sin secreto)
    pub tenant_id: Option<String>,     // Tenant de Microsoft
    pub sync_folders: Vec<String>,     // Carpetas a sincronizar (serializado como JSON array)
    pub file_filter: Vec<String>,      // Extensiones extra (vacío = usar ALLOWED_EXTENSIONS)
    pub max_file_mb: i64,
    pub is_active: bool,
    pub last_synced: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Archivo conocido por el conector (metadata — no contenido).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectorFile {
    pub id: String,
    pub connector_id: String,
    pub name: String,
    pub path: String,
    pub local_path: Option<String>,
    pub size_bytes: Option<i64>,
    pub mime_type: Option<String>,
    pub modified_remote: Option<i64>,
    pub modified_local: Option<i64>,
    pub sync_status: FileSyncStatus,
    pub etag: Option<String>,
    pub created_at: i64,
}

/// Resumen del resultado de una operación de sync.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncReport {
    pub connector_id: String,
    pub discovered: usize,
    pub downloaded: usize,
    pub skipped: usize,
    pub conflicts: usize,
    pub errors: Vec<String>,
    pub duration_ms: u64,
}

/// Input validado para registrar un conector local.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterLocalConnectorInput {
    pub project_id: String,
    pub workspace_id: Option<String>,
    pub display_name: String,
    pub root_path: String,
    pub file_filter: Vec<String>,  // vacío = usar ALLOWED_EXTENSIONS globales
    pub max_file_mb: Option<i64>,
}

impl RegisterLocalConnectorInput {
    pub fn validate(&self) -> Result<(), String> {
        if self.project_id.trim().is_empty() {
            return Err("project_id requerido".into());
        }
        if self.display_name.trim().is_empty() {
            return Err("display_name requerido".into());
        }
        if self.root_path.trim().is_empty() {
            return Err("root_path requerido".into());
        }
        if !std::path::Path::new(&self.root_path).exists() {
            return Err(format!("root_path no existe: {}", self.root_path));
        }
        if let Some(mb) = self.max_file_mb {
            if mb < 1 || mb > 2048 {
                return Err("max_file_mb debe estar entre 1 y 2048".into());
            }
        }
        Ok(())
    }
}
