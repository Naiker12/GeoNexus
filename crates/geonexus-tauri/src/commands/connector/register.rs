use tauri::State;
use uuid::Uuid;
use crate::AppState;
use geonexus_core::connector::{ConnectorConfig, ConnectorProvider, RegisterLocalConnectorInput};
use geonexus_db::connector_repo;
use crate::commands::connector::unix_now;

/// Registra una carpeta local como conector del proyecto.
/// Valida que la ruta exista antes de persistir.
#[tauri::command]
pub async fn register_local_connector(
    input: RegisterLocalConnectorInput,
    state: State<'_, AppState>,
) -> Result<ConnectorConfig, String> {
    input.validate()?;

    let now = unix_now();
    let max_mb = input.max_file_mb.unwrap_or(500);

    let cfg = ConnectorConfig {
        id: Uuid::new_v4().to_string(),
        project_id: input.project_id,
        workspace_id: input.workspace_id,
        provider: ConnectorProvider::Local,
        display_name: input.display_name,
        root_path: Some(input.root_path),
        qgis_project_path: None,
        base_url: None,
        client_id: None,
        tenant_id: None,
        sync_folders: vec![],
        file_filter: input.file_filter,
        max_file_mb: max_mb,
        is_active: true,
        last_synced: None,
        created_at: now,
        updated_at: now,
    };

    connector_repo::insert_connector_config(&state.db, &cfg)
        .await
        .map_err(|e| {
            tracing::error!(
                project_id = %cfg.project_id,
                error = %e,
                "register_local_connector: insert falló"
            );
            "Error al registrar conector".to_string()
        })?;

    Ok(cfg)
}
