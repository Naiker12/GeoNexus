pub mod register;
pub mod list;
pub mod sync;
pub mod dropbox;
pub mod onedrive;

pub use register::*;
pub use list::*;
pub use sync::*;
pub use dropbox::*;
pub use onedrive::*;

use geonexus_core::AssetKind;

pub(crate) fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub(crate) fn map_extension_to_kind(name: &str) -> AssetKind {
    let ext = std::path::Path::new(name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "pdf" => AssetKind::Document,
        "docx" | "doc" => AssetKind::Word,
        "xlsx" | "xls" => AssetKind::Excel,
        "geojson" | "json" => AssetKind::Layer,
        "shp" => AssetKind::Shapefile,
        "csv" => AssetKind::Csv,
        "tif" | "tiff" => AssetKind::Raster,
        _ => AssetKind::Other,
    }
}
