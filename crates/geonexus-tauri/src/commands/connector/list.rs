use tauri::State;
use crate::AppState;
use geonexus_core::connector::{ConnectorConfig, ConnectorFile};
use geonexus_db::connector_repo;

/// Lista los archivos de un conector local según su root_path y filtros.
#[tauri::command]
pub async fn list_connector_files(
    connector_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ConnectorFile>, String> {
    if connector_id.trim().is_empty() {
        return Err("connector_id requerido".into());
    }

    connector_repo::list_connector_files(&state.db, &connector_id)
        .await
        .map_err(|e| {
            tracing::error!(connector_id = %connector_id, error = %e, "list_connector_files falló");
            "Error al listar archivos del conector".to_string()
        })
}

/// Lista todas las configuraciones de conectores activos del proyecto.
#[tauri::command]
pub async fn list_connector_configs(
    project_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<ConnectorConfig>, String> {
    let pid = project_id.unwrap_or_default();
    connector_repo::list_connector_configs(&state.db, &pid)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "list_connector_configs falló");
            "Error al listar configuraciones de conectores".to_string()
        })
}
