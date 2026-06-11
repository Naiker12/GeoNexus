use geonexus_core::reasoning::QueryIntent;

pub fn classify_intent(content: &str) -> QueryIntent {
    let lower = content.to_lowercase();

    if has_any_keyword(
        &lower,
        &[
            "buffer", "distancia", "radio", "área", "área", "intersec",
            "heatmap", "cluster", "polígono", "poligono", "capa gis",
            "shapefile", "coordenada", "metros", "kilometros", "mapa",
            "geometria", "geometría", "superficie", "perímetro",
        ],
    ) {
        return QueryIntent::AnalisisEspacial;
    }

    if has_any_keyword(
        &lower,
        &[
            "artículo", "artículo", "art.", "norma", "pot", "decreto",
            "resolución", "resolucion", "aplica", "prohibe", "prohíbe",
            "permite", "zonificación", "zonificacion", "retiro",
            "uso de suelo", "licencia", "articulo",
        ],
    ) {
        return QueryIntent::ConsultaNormativa;
    }

    if has_any_keyword(
        &lower,
        &[
            "qué capas", "que capas", "qué datos", "que datos",
            "qué archivos", "que archivos", "tengo", "existe",
            "está disponible", "esta disponible", "buscar capa",
            "encontrar dataset", "listar archivos", "muestra",
            "mis capas", "mis datos", "inventario",
        ],
    ) {
        return QueryIntent::DescubrimientoDatos;
    }

    if has_any_keyword(
        &lower,
        &[
            "qué hicimos", "que hicimos", "análisis anterior",
            "analisis anterior", "sesión pasada", "sesion pasada",
            "continuar", "recuerda", "el proyecto del",
            "último análisis", "ultimo analisis", "historial",
            "anteriormente",
        ],
    ) {
        return QueryIntent::MemoriaProyecto;
    }

    if has_any_keyword(
        &lower,
        &[
            "genera un informe", "exportar", "descargar pdf",
            "crear reporte", "generar mapa", "entregable",
            "documento final", "presentación", "presentacion",
            "reporte pdf", "informe técnico", "informe tecnico",
        ],
    ) {
        return QueryIntent::GeneracionEntregable;
    }

    QueryIntent::ConsultaGeneral
}

fn has_any_keyword(text: &str, keywords: &[&str]) -> bool {
    keywords.iter().any(|k| text.contains(k))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_analisis_espacial() {
        assert_eq!(
            classify_intent("genera un buffer de 500m alrededor del río"),
            QueryIntent::AnalisisEspacial
        );
        assert_eq!(
            classify_intent("haz un heatmap de densidad poblacional"),
            QueryIntent::AnalisisEspacial
        );
    }

    #[test]
    fn classifies_consulta_normativa() {
        assert_eq!(
            classify_intent("qué dice el artículo 45 del POT"),
            QueryIntent::ConsultaNormativa
        );
        assert_eq!(
            classify_intent("aplica la norma de retiro hídrico aquí"),
            QueryIntent::ConsultaNormativa
        );
    }

    #[test]
    fn classifies_descubrimiento() {
        assert_eq!(
            classify_intent("qué capas tengo del norte de la ciudad"),
            QueryIntent::DescubrimientoDatos
        );
    }

    #[test]
    fn classifies_memoria() {
        assert_eq!(
            classify_intent("qué hicimos la semana pasada"),
            QueryIntent::MemoriaProyecto
        );
    }

    #[test]
    fn classifies_entregable() {
        assert_eq!(
            classify_intent("genera un informe PDF del análisis"),
            QueryIntent::GeneracionEntregable
        );
    }

    #[test]
    fn defaults_to_general() {
        assert_eq!(
            classify_intent("hola cómo estás"),
            QueryIntent::ConsultaGeneral
        );
        assert_eq!(
            classify_intent("explícame qué es una zonificación"),
            QueryIntent::ConsultaNormativa
        );
    }
}
