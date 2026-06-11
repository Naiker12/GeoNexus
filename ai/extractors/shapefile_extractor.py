"""Shapefile extractor for GeoNexus.
Extracts metadata from .shp, .gpkg, .geojson files and converts to text chunks.
"""

from pathlib import Path
from typing import Any


def _try_fiona(filepath: str) -> dict | None:
    """Try extracting metadata using fiona (GDAL binding)."""
    try:
        import fiona
        with fiona.open(filepath) as src:
            return {
                "crs": str(src.crs) if src.crs else "Unknown",
                "schema": src.schema,
                "feature_count": len(src),
                "bounds": list(src.bounds) if src.bounds else [],
                "driver": src.driver,
                "layer_name": Path(filepath).stem,
            }
    except ImportError:
        return None
    except Exception as e:
        return {"error": str(e)}


def _try_geopandas(filepath: str) -> dict | None:
    """Fallback using GeoPandas."""
    try:
        import geopandas as gpd
        gdf = gpd.read_file(filepath)
        bounds = gdf.total_bounds.tolist() if hasattr(gdf, "total_bounds") else []
        return {
            "crs": str(gdf.crs) if gdf.crs else "Unknown",
            "schema": {
                "geometry": gdf.geometry.type.iloc[0] if len(gdf) > 0 else "Unknown",
                "properties": list(gdf.columns),
            },
            "feature_count": len(gdf),
            "bounds": bounds,
            "driver": Path(filepath).suffix[1:].upper(),
            "layer_name": Path(filepath).stem,
        }
    except ImportError:
        return None
    except Exception as e:
        return {"error": str(e)}


def extract_shapefile_metadata(filepath: str) -> dict:
    """Extract metadata from a GIS file.

    Tries fiona first, then geopandas, then returns a minimal fallback.
    """
    result = _try_fiona(filepath)
    if result is None:
        result = _try_geopandas(filepath)
    if result is None:
        p = Path(filepath)
        result = {
            "layer_name": p.stem,
            "driver": p.suffix[1:].upper() if p.suffix else "Unknown",
            "feature_count": 0,
            "crs": "Unknown",
            "schema": {"properties": [], "geometry": "Unknown"},
            "bounds": [],
        }
    return result


def shapefile_to_text_chunks(filepath: str) -> list[dict[str, Any]]:
    """Convert shapefile metadata to indexable text chunks.

    Each chunk describes one aspect of the layer.
    """
    meta = extract_shapefile_metadata(filepath)
    layer = meta.get("layer_name", "unknown")
    chunks = []

    chunks.append({
        "chunk_index": 0,
        "content": f"Capa GIS: {layer}. "
                   f"Tipo: {meta.get('driver', 'desconocido')}. "
                   f"Sistema de coordenadas: {meta.get('crs', 'desconocido')}.",
        "token_count": 40,
        "page_number": None,
    })

    schema = meta.get("schema", {})
    props = schema.get("properties", [])
    if props:
        props_text = ", ".join(str(p) for p in props[:20])
        chunks.append({
            "chunk_index": 1,
            "content": f"Atributos de {layer}: {props_text}.",
            "token_count": 20 + len(props_text) // 4,
            "page_number": None,
        })

    if meta.get("feature_count", 0) > 0:
        chunks.append({
            "chunk_index": 2,
            "content": f"Número de entidades en {layer}: {meta['feature_count']}. "
                       f"Extensión geográfica: {meta.get('bounds', [])}.",
            "token_count": 30,
            "page_number": None,
        })

    return chunks
