use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use crate::allowlist::extension_permitida;
use crate::connector::types::{ConnectorFile, FileSyncStatus};

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
            // Verificar que el subdirectorio esté dentro de la raíz antes de entrar (verificación de lista de permitidos)
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

fn stable_file_id(connector_id: &str, rel_path: &str) -> String {
    let normalized_path = rel_path.replace('\\', "/");
    format!("{connector_id}:{normalized_path}")
}
