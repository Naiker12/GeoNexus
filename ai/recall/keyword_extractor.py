"""Keyword extractor for enhanced RAG recall.
Extracts GIS-specific and proper-noun keywords from user queries
to boost relevance scoring in ChromaDB searches.
"""

import re
from typing import List

GIS_KEYWORDS: set[str] = {
    "capas", "layer", "shapefile", "geojson", "raster", "vector",
    "coordenadas", "crs", "epsg", "proyecto", "mapa", "geoproceso",
    "atributos", "entidades", "geometria", "poligono", "punto", "linea",
    "norma", "pot", "uso", "suelo", "altura", "zona", "residencial",
    "comercial", "industrial", "cesion", "urbanistica", "estratificacion",
    "catastro", "parcela", "manzana", "predio", "lote", "construccion",
    "via", "calle", "avenida", "espacio", "publico", "equipamiento",
    "densidad", "edificabilidad", "indexacion", "memoria", "chunk",
}


def extract_keywords(query: str, max_keywords: int = 8) -> List[str]:
    """Extract relevant keywords from a user query.

    Prioritizes known GIS terms, then proper nouns (capitalized words).
    Deduplicates while preserving order.

    Args:
        query: The user's input text.
        max_keywords: Maximum number of keywords to return.

    Returns:
        A list of keyword strings.
    """
    words = re.findall(r"\b[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]{4,}\b", query)
    seen: set[str] = set()
    keywords: list[str] = []

    for word in words:
        lower = word.lower()
        if lower in GIS_KEYWORDS and lower not in seen:
            seen.add(lower)
            keywords.append(word)

    for word in words:
        lower = word.lower()
        if word[0].isupper() and lower not in seen:
            seen.add(lower)
            keywords.append(word)

    return keywords[:max_keywords]


def score_chunk_by_keywords(
    chunk_text: str,
    keywords: List[str],
    base_score: float = 0.0,
    keyword_boost: float = 0.15,
) -> float:
    """Calculate a boosted score for a chunk based on keyword matches.

    Args:
        chunk_text: The text content of the chunk.
        keywords: List of keywords to match against.
        base_score: Starting score (typically 1 - distance).
        keyword_boost: Score increment per matching keyword.

    Returns:
        The final boosted score.
    """
    lower_text = chunk_text.lower()
    matched = sum(1 for kw in keywords if kw.lower() in lower_text)
    return base_score + (matched * keyword_boost)
