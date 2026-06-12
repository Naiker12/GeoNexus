#[cfg(test)]
mod tests {
    use crate::connector::types::{
        ConnectorProvider, FileSyncStatus, RegisterLocalConnectorInput, ConnectorFile
    };
    use crate::connector::local::{calcular_diff, listar_archivos_locales};
    use crate::allowlist::MAX_FILE_BYTES_DEFAULT;
    use std::fs;
    use std::path::PathBuf;

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

    fn crear_dir_temporal_con_archivos() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("geonexus_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();

        fs::write(dir.join("predios.geojson"), r#"{"type":"FeatureCollection","features":[]}"#).unwrap();
        fs::write(dir.join("barrios.shp"),     b"contenido shp simulado").unwrap();
        fs::write(dir.join("foto.jpg"),         b"jpg simulado").unwrap(); // no debe aparecer
        fs::write(dir.join("script.exe"),       b"exe simulado").unwrap(); // no debe aparecer

        dir
    }

    #[test]
    fn listar_filtra_extensiones_no_gis() {
        let dir = crear_dir_temporal_con_archivos();
        let archivos = listar_archivos_locales(
            "connector-1",
            dir.to_str().unwrap(),
            MAX_FILE_BYTES_DEFAULT,
            false,
        ).unwrap();

        let nombres: Vec<&str> = archivos.iter().map(|f| f.name.as_str()).collect();
        assert!(nombres.contains(&"predios.geojson"));
        assert!(nombres.contains(&"barrios.shp"));
        assert!(!nombres.contains(&"foto.jpg"));
        assert!(!nombres.contains(&"script.exe"));

        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn listar_retorna_vacio_si_no_hay_archivos_gis() {
        let dir = std::env::temp_dir().join(format!("geonexus_empty_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join("notas.txt"), b"texto").unwrap();

        let archivos = listar_archivos_locales(
            "c1",
            dir.to_str().unwrap(),
            MAX_FILE_BYTES_DEFAULT,
            false,
        ).unwrap();

        assert!(archivos.is_empty());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn listar_falla_si_root_no_existe() {
        let resultado = listar_archivos_locales(
            "c1",
            "/ruta/que/no/existe/jamas/xyz",
            MAX_FILE_BYTES_DEFAULT,
            false,
        );
        assert!(resultado.is_err());
    }

    #[test]
    fn calcular_diff_identifica_nuevos() {
        let nuevo = ConnectorFile {
            id: "f1".into(), connector_id: "c1".into(),
            name: "nuevo.geojson".into(), path: "nuevo.geojson".into(),
            local_path: None, size_bytes: None, mime_type: None,
            modified_remote: Some(1000), modified_local: None,
            sync_status: FileSyncStatus::Pending,
            etag: None, created_at: 0,
        };
        let (nuevos, actualizados) = calcular_diff(&[nuevo], &[]);
        assert_eq!(nuevos.len(), 1);
        assert!(actualizados.is_empty());
    }

    #[test]
    fn calcular_diff_identifica_actualizados_por_modified_remote() {
        let base = ConnectorFile {
            id: "f1".into(), connector_id: "c1".into(),
            name: "mapa.shp".into(), path: "mapa.shp".into(),
            local_path: None, size_bytes: None, mime_type: None,
            modified_remote: Some(1000), modified_local: None,
            sync_status: FileSyncStatus::Synced,
            etag: None, created_at: 0,
        };
        let actualizado = ConnectorFile {
            modified_remote: Some(2000),
            ..base.clone()
        };
        let (nuevos, actualizados) = calcular_diff(&[actualizado], &[base]);
        assert!(nuevos.is_empty());
        assert_eq!(actualizados.len(), 1);
    }

    #[test]
    fn calcular_diff_no_marca_como_nuevo_si_ya_existe_sin_cambios() {
        let archivo = ConnectorFile {
            id: "f1".into(), connector_id: "c1".into(),
            name: "existente.csv".into(), path: "existente.csv".into(),
            local_path: None, size_bytes: None, mime_type: None,
            modified_remote: Some(1000), modified_local: None,
            sync_status: FileSyncStatus::Synced,
            etag: None, created_at: 0,
        };
        let (nuevos, actualizados) = calcular_diff(&[archivo.clone()], &[archivo]);
        assert!(nuevos.is_empty());
        assert!(actualizados.is_empty());
    }
}
