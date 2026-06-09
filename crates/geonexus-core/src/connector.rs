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
    pub root_path: Option<String>,     // solo para Local
    pub qgis_project_path: Option<String>,
    pub base_url: Option<String>,      // SharePoint on-prem, S3 custom
    pub client_id: Option<String>,     // App registration (no secret)
    pub tenant_id: Option<String>,     // Microsoft tenant
    pub sync_folders: Vec<String>,     // carpetas a sincronizar (serializado como JSON array)
    pub file_filter: Vec<String>,      // extensiones extra (vacío = usar ALLOWED_EXTENSIONS)
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

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_input() -> RegisterLocalConnectorInput {
        RegisterLocalConnectorInput {
            project_id: "proj-1".into(),
            workspace_id: None,
            display_name: "Mi conector".into(),
            root_path: std::env::temp_dir().to_string_lossy().to_string(),
            file_filter: vec![],
            max_file_mb: Some(100),
        }
    }

    #[test]
    fn connector_provider_serializes_snake_case() {
        assert_eq!(
            serde_json::to_value(ConnectorProvider::Local).unwrap(),
            serde_json::json!("local")
        );
        assert_eq!(
            serde_json::to_value(ConnectorProvider::OneDrive).unwrap(),
            serde_json::json!("one_drive")
        );
        assert_eq!(
            serde_json::to_value(ConnectorProvider::GoogleDrive).unwrap(),
            serde_json::json!("google_drive")
        );
    }

    #[test]
    fn file_sync_status_serializes_snake_case() {
        assert_eq!(
            serde_json::to_value(FileSyncStatus::Pending).unwrap(),
            serde_json::json!("pending")
        );
        assert_eq!(
            serde_json::to_value(FileSyncStatus::Synced).unwrap(),
            serde_json::json!("synced")
        );
        assert_eq!(
            serde_json::to_value(FileSyncStatus::Conflict).unwrap(),
            serde_json::json!("conflict")
        );
    }

    #[test]
    fn validate_rechaza_project_id_vacio() {
        let input = RegisterLocalConnectorInput {
            project_id: "".into(),
            ..valid_input()
        };
        assert!(input.validate().is_err());
    }

    #[test]
    fn validate_rechaza_display_name_vacio() {
        let input = RegisterLocalConnectorInput {
            display_name: "".into(),
            ..valid_input()
        };
        assert!(input.validate().is_err());
    }

    #[test]
    fn validate_rechaza_root_path_vacio() {
        let input = RegisterLocalConnectorInput {
            root_path: "".into(),
            ..valid_input()
        };
        assert!(input.validate().is_err());
    }

    #[test]
    fn validate_rechaza_root_path_inexistente() {
        let input = RegisterLocalConnectorInput {
            root_path: "C:\\no_existe_xyz_123".into(),
            ..valid_input()
        };
        assert!(input.validate().is_err());
    }

    #[test]
    fn validate_rechaza_max_file_mb_menor_que_1() {
        let input = RegisterLocalConnectorInput {
            max_file_mb: Some(0),
            ..valid_input()
        };
        assert!(input.validate().is_err());
    }

    #[test]
    fn validate_rechaza_max_file_mb_mayor_que_2048() {
        let input = RegisterLocalConnectorInput {
            max_file_mb: Some(2049),
            ..valid_input()
        };
        assert!(input.validate().is_err());
    }

    #[test]
    fn validate_acepta_input_valido() {
        assert!(valid_input().validate().is_ok());
    }

    #[test]
    fn validate_acepta_max_file_mb_sin_valor() {
        let input = RegisterLocalConnectorInput {
            max_file_mb: None,
            ..valid_input()
        };
        assert!(input.validate().is_ok());
    }
}
