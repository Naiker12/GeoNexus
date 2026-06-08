use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::allowlist::extension_permitida;
use crate::connector::{ConnectorFile, FileSyncStatus};

/// Lista archivos en `root_path` filtrados por extensión y tamaño.
/// Recursivo si `recursive = true`.
/// No accede a rutas fuera de `root_path`.
pub fn listar_archivos_locales(
    connector_id: &str,
    root_path: &str,
    max_file_bytes: i64,
    recursive: bool,
) -> Result<Vec<ConnectorFile>, String> {
    let root = Path::new(root_path);
    if !root.exists() {
        return Err(format!("root_path no existe: {root_path}"));
    }

    // Canonicalizar root para validar allowlist en recursión
    let root_canon = root
        .canonicalize()
        .map_err(|e| format!("No se pudo canonicalizar root_path: {e}"))?;

    let mut archivos = Vec::new();
    let now = unix_now();

    listar_dir_recursivo(&root_canon, &root_canon, connector_id, max_file_bytes, recursive, &mut archivos, now)?;

    Ok(archivos)
}

fn listar_dir_recursivo(
    root: &Path,
    dir: &Path,
    connector_id: &str,
    max_file_bytes: i64,
    recursive: bool,
    acum: &mut Vec<ConnectorFile>,
    now: i64,
) -> Result<(), String> {
    let entries = std::fs::read_dir(dir)
        .map_err(|e| format!("No se pudo leer directorio {}: {e}", dir.display()))?;

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_dir() && recursive {
            // Verificar que la subdir esté dentro de root antes de entrar (allowlist check)
            if let Ok(canon) = path.canonicalize() {
                if canon.starts_with(root) {
                    listar_dir_recursivo(root, &canon, connector_id, max_file_bytes, recursive, acum, now)?;
                }
            }
            continue;
        }

        if !path.is_file() {
            continue;
        }

        let nombre = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        if !extension_permitida(&nombre) {
            continue;
        }

        let metadata = match std::fs::metadata(&path) {
            Ok(m) => m,
            Err(_) => continue,
        };

        let size = metadata.len() as i64;
        if size > max_file_bytes {
            continue;
        }

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64);

        let rel_path = path
            .strip_prefix(root)
            .map(|p| p.display().to_string())
            .unwrap_or_else(|_| nombre.clone());

        acum.push(ConnectorFile {
            id: stable_file_id(connector_id, &rel_path),
            connector_id: connector_id.to_string(),
            name: nombre,
            path: rel_path,
            local_path: Some(path.display().to_string()),
            size_bytes: Some(size),
            mime_type: None,
            modified_remote: modified,
            modified_local: modified,
            sync_status: FileSyncStatus::Pending,
            etag: None,
            created_at: now,
        });
    }

    Ok(())
}

/// Compara archivos remotos con los registrados en SQLite y devuelve un reporte.
/// La persistencia (INSERT/UPDATE) la hace el repo — esta función solo clasifica.
pub fn calcular_diff(
    descubiertos: &[ConnectorFile],
    existentes: &[ConnectorFile],
) -> (Vec<ConnectorFile>, Vec<ConnectorFile>) {
    let existentes_ids: std::collections::HashSet<&str> =
        existentes.iter().map(|f| f.path.as_str()).collect();

    let nuevos: Vec<ConnectorFile> = descubiertos
        .iter()
        .filter(|f| !existentes_ids.contains(f.path.as_str()))
        .cloned()
        .collect();

    let actualizados: Vec<ConnectorFile> = descubiertos
        .iter()
        .filter(|f| {
            existentes.iter().any(|e| {
                e.path == f.path
                    && e.modified_remote != f.modified_remote
            })
        })
        .cloned()
        .collect();

    (nuevos, actualizados)
}

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

// ─── Tests ───────────────────────────────────────────────────────────────────

fn stable_file_id(connector_id: &str, rel_path: &str) -> String {
    let normalized_path = rel_path.replace('\\', "/");
    format!("{connector_id}:{normalized_path}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::allowlist::MAX_FILE_BYTES_DEFAULT;
    use std::fs;
    use std::path::PathBuf;

    fn crear_dir_temporal_con_archivos() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("geonexus_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();

        fs::write(dir.join("predios.geojson"), r#"{"type":"FeatureCollection","features":[]}"#).unwrap();
        fs::write(dir.join("barrios.shp"),     b"fake shp content").unwrap();
        fs::write(dir.join("foto.jpg"),         b"fake jpg").unwrap(); // no debe aparecer
        fs::write(dir.join("script.exe"),       b"fake exe").unwrap(); // no debe aparecer

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
            modified_remote: Some(2000), // cambió en remoto
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
