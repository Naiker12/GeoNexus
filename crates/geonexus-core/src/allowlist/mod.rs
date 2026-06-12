use std::path::{Path, PathBuf};

/// Extensiones GIS y documentales que el sistema acepta descargar/cachear.
/// Modificar aquí se refleja en todo el sistema (core, sidecar, MCP).
pub const ALLOWED_EXTENSIONS: &[&str] = &[
    ".geojson", ".shp", ".shx", ".dbf", ".prj",  // Shapefile completo
    ".dxf", ".dwg",                                // CAD
    ".kml", ".kmz", ".gpx",                        // GPS / Google Earth
    ".gdb", ".gpkg",                               // Geodatabase / GeoPackage
    ".tif", ".tiff", ".geotiff",                   // Raster georreferenciado
    ".csv",                                        // Tabular
    ".pdf",                                        // Documentos normativos
    ".xlsx", ".xls",                               // Excel
    ".zip",                                        // Comprimido (puede contener SHP)
    ".json",                                       // GeoJSON sin extensión explícita
    ".docx", ".doc", ".xlsm",                      // Word y Excel adicionales
    ".tar.gz",                                     // Otros comprimidos
    ".cpg", ".img", ".ecw",                        // Auxiliares y rasters GIS
];

/// Tamaño máximo por defecto en bytes (500 MB).
pub const MAX_FILE_BYTES_DEFAULT: i64 = 500 * 1024 * 1024;

/// Comprueba si la extensión de un archivo está permitida.
pub fn extension_permitida(nombre: &str) -> bool {
    let lower = nombre.to_lowercase();
    ALLOWED_EXTENSIONS.iter().any(|ext| lower.ends_with(ext))
}

#[derive(Debug, PartialEq, Eq)]
pub enum AllowlistError {
    NotCanonical(String),
    OutOfScope(String),
    IsDirectory(String),
}

impl std::fmt::Display for AllowlistError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotCanonical(p) => write!(f, "Ruta no canónica o no accesible: {p}"),
            Self::OutOfScope(p) => write!(f, "Ruta fuera de la allowlist del conector: {p}"),
            Self::IsDirectory(p) => write!(f, "Ruta es directorio, se esperaba archivo: {p}"),
        }
    }
}

impl std::error::Error for AllowlistError {}

/// Verifica que `ruta` esté dentro de `root` después de canonicalizar.
/// Previene path traversal (../../etc/passwd).
pub fn verificar_ruta(root: &Path, ruta: &Path) -> Result<PathBuf, AllowlistError> {
    let root_canon = root
        .canonicalize()
        .map_err(|_| AllowlistError::NotCanonical(root.display().to_string()))?;

    let ruta_canon = ruta
        .canonicalize()
        .map_err(|_| AllowlistError::NotCanonical(ruta.display().to_string()))?;

    if !ruta_canon.starts_with(&root_canon) {
        return Err(AllowlistError::OutOfScope(ruta_canon.display().to_string()));
    }

    if ruta_canon.is_dir() {
        return Err(AllowlistError::IsDirectory(ruta_canon.display().to_string()));
    }

    Ok(ruta_canon)
}

/// Construye la ruta completa y la verifica contra la allowlist.
pub fn ruta_segura(root: &str, rel_path: &str) -> Result<PathBuf, AllowlistError> {
    let root = Path::new(root);
    let ruta = root.join(rel_path);
    verificar_ruta(root, &ruta)
}

mod tests;
