"""GIS tools for the AI agent — shapefile extraction and geospatial utilities."""

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def shapefile_to_text_chunks(file_path: str) -> list[dict[str, Any]]:
    """Extract text chunks from a shapefile (.shp) for indexing."""
    try:
        import shapefile  # pyshp
    except ImportError:
        logger.warning("pyshp not installed, cannot extract shapefile")
        return [{"error": "pyshp no instalado"}]

    try:
        sf = shapefile.Reader(file_path)
        chunks = []
        fields = [f[0] for f in sf.fields if f[0] not in ("DeletionFlag",)]
        for i, srec in enumerate(sf.shapeRecords()):
            attrs = dict(zip(fields, srec.record))
            geom_type = srec.shape.shapeTypeName if hasattr(srec.shape, 'shapeTypeName') else f"ShapeType_{srec.shape.shapeType}"
            chunk = {
                "chunk_index": i,
                "shape_type": geom_type,
                "attributes": json.dumps(attrs, ensure_ascii=False, default=str),
                "bbox": list(srec.shape.bbox) if srec.shape.bbox else None,
                "points_count": len(srec.shape.points) if srec.shape.points else 0,
            }
            chunks.append(chunk)
        return chunks
    except Exception as e:
        logger.error("Error reading shapefile %s: %s", file_path, e)
        return [{"error": str(e)}]
