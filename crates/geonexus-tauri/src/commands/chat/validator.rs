use geonexus_core::reasoning::ValidationResult;

use super::{ContextAsset, ContextNode};

pub fn validate_response(
    response: &str,
    graph_nodes: &[ContextNode],
    assets: &[ContextAsset],
) -> ValidationResult {
    let mut warnings: Vec<String> = vec![];

    let article_refs = extract_article_refs(response);
    for art in &article_refs {
        let exists = graph_nodes.iter().any(|n| {
            n.label.to_lowercase().contains(&art.to_lowercase())
                || n.label.to_lowercase().contains(&format!("art. {}", art))
        });
        if !exists {
            warnings.push(format!(
                "Artículo '{}' mencionado pero no está en el grafo del proyecto",
                art
            ));
        }
    }

    let layer_refs = extract_layer_mentions(response);
    for layer in &layer_refs {
        let exists = assets.iter().any(|a| {
            a.name.to_lowercase().contains(&layer.to_lowercase())
        });
        if !exists {
            warnings.push(format!(
                "Capa '{}' mencionada pero no encontrada en assets indexados",
                layer
            ));
        }
    }

    ValidationResult {
        passed: warnings.is_empty(),
        warnings,
    }
}

fn extract_article_refs(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    let markers = ["artículo ", "articulo ", "art. ", "art "];
    let mut refs = vec![];
    for marker in &markers {
        let mut search_start = 0;
        while let Some(pos) = lower[search_start..].find(marker) {
            let after = &lower[search_start + pos + marker.len()..];
            let digits: String = after.chars().take_while(|c| c.is_ascii_digit()).collect();
            if !digits.is_empty() {
                refs.push(digits);
            }
            search_start = search_start + pos + marker.len();
        }
    }
    refs
}

fn extract_layer_mentions(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    let keywords = [
        "capa", "shapefile", "geojson", "layer", "geotiff", "raster",
    ];
    let mut layers = vec![];
    for kw in &keywords {
        if let Some(pos) = lower.find(kw) {
            let start = pos.saturating_sub(30);
            let end = (pos + kw.len() + 30).min(lower.len());
            let snippet = &lower[start..end];
            layers.push(snippet.to_string());
        }
    }
    layers
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_nodes() -> Vec<ContextNode> {
        vec![
            ContextNode { label: "Art. 45".into(), kind: "norma".into() },
            ContextNode { label: "Art. 67".into(), kind: "norma".into() },
        ]
    }

    fn sample_assets() -> Vec<ContextAsset> {
        vec![
            ContextAsset { name: "usos_suelo.shp".into(), kind: "shapefile".into(), status: "ready".into() },
        ]
    }

    #[test]
    fn validates_correct_articles() {
        let result = validate_response(
            "Según el Artículo 45 del POT...",
            &sample_nodes(),
            &[],
        );
        assert!(result.passed);
        assert!(result.warnings.is_empty());
    }

    #[test]
    fn warns_on_missing_article() {
        let result = validate_response(
            "El Artículo 999 no existe en el grafo.",
            &sample_nodes(),
            &[],
        );
        assert!(!result.passed);
        assert!(result.warnings.iter().any(|w| w.contains("999")));
    }

    #[test]
    fn warns_on_missing_layer() {
        let result = validate_response(
            "La capa de riesgo_inundacion muestra...",
            &sample_nodes(),
            &sample_assets(),
        );
        assert!(!result.passed);
        assert!(result.warnings.iter().any(|w| w.contains("riesgo_inundacion")));
    }
}
