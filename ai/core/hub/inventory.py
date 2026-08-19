"""GeoNexus AI Hub — Local Inventory & Storage Manager.

Escanea el directorio local de modelos (`~/.cache/geonexus/models`), calcula
el espacio en disco ocupado por formato (GGUF, Safetensors, LoRA) y permite
eliminar modelos para liberar almacenamiento.
"""

import os
import shutil
from pathlib import Path
from typing import Any, Dict, List

MODELS_DIR = Path(os.path.expanduser("~/.cache/geonexus/models"))


def get_models_directory() -> Path:
    """Asegura y retorna la ruta del directorio de almacenamiento local de modelos."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    return MODELS_DIR


def scan_local_inventory() -> Dict[str, Any]:
    """Escanea los archivos y carpetas de modelos presentes en disco."""
    root = get_models_directory()
    items: List[Dict[str, Any]] = []
    total_used_bytes = 0

    if root.exists():
        for entry in root.iterdir():
            try:
                if entry.is_file():
                    size = entry.stat().st_size
                    total_used_bytes += size
                    fmt = "gguf" if entry.suffix.lower() == ".gguf" else entry.suffix.lower().replace(".", "")
                    items.append({
                        "id": entry.stem,
                        "name": entry.name,
                        "filename": entry.name,
                        "path": str(entry.resolve()),
                        "size_gb": round(size / (1024 ** 3), 2),
                        "format": fmt,
                        "modified_at": int(entry.stat().st_mtime),
                        "is_dir": False,
                    })
                elif entry.is_dir():
                    dir_size = sum(f.stat().st_size for f in entry.rglob("*") if f.is_file())
                    total_used_bytes += dir_size
                    items.append({
                        "id": entry.name,
                        "name": entry.name,
                        "filename": entry.name,
                        "path": str(entry.resolve()),
                        "size_gb": round(dir_size / (1024 ** 3), 2),
                        "format": "safetensors",
                        "modified_at": int(entry.stat().st_mtime),
                        "is_dir": True,
                    })
            except Exception:
                pass

    # Espacio libre en disco
    total_disk_free_gb = 100.0
    try:
        usage = shutil.disk_usage(root)
        total_disk_free_gb = round(usage.free / (1024 ** 3), 2)
    except Exception:
        pass

    return {
        "models_dir": str(root.resolve()),
        "total_models": len(items),
        "total_disk_used_gb": round(total_used_bytes / (1024 ** 3), 2),
        "total_disk_free_gb": total_disk_free_gb,
        "models": sorted(items, key=lambda x: x["modified_at"], reverse=True),
    }


def delete_local_model(model_name_or_filename: str) -> Dict[str, Any]:
    """Elimina un modelo o archivo cuantizado del almacenamiento local."""
    root = get_models_directory()
    target = root / model_name_or_filename

    if not target.exists():
        # Búsqueda parcial por stem
        candidates = list(root.glob(f"{model_name_or_filename}*"))
        if candidates:
            target = candidates[0]
        else:
            return {"status": "error", "message": f"Modelo no encontrado en {root}"}

    try:
        if target.is_file():
            target.unlink()
        elif target.is_dir():
            shutil.rmtree(target)
        return {"status": "success", "message": f"Eliminado: {target.name}"}
    except Exception as e:
        return {"status": "error", "message": f"Error al eliminar {target.name}: {str(e)}"}
