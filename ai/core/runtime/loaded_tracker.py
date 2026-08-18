"""GeoNexus AI Runtime — Loaded Models Tracker & VRAM Arbiter.

Mantiene el registro de los modelos que están cargados actualmente en memoria
(LLM de texto, difusión de imágenes, embeddings, LoRAs) y permite eyectarlos
para liberar VRAM y RAM al instante.
"""

import gc
from typing import Any, Dict, List, Optional

try:
    import torch
except ImportError:
    torch = None

# Almacén en memoria de modelos activos
LOADED_MODELS: Dict[str, Dict[str, Any]] = {}


def register_loaded_model(
    model_id: str,
    name: str,
    kind: str = "text",  # "text" | "image" | "audio" | "training"
    vram_gb: float = 0.0,
    ram_gb: float = 0.0,
    device: str = "cuda:0",
) -> Dict[str, Any]:
    """Registra un modelo recién cargado en memoria."""
    entry = {
        "id": model_id,
        "name": name,
        "kind": kind,
        "vram_gb": vram_gb,
        "ram_gb": ram_gb,
        "device": device,
        "status": "active",
    }
    LOADED_MODELS[model_id] = entry
    return entry


def list_loaded_models() -> Dict[str, Any]:
    """Retorna la lista de modelos vivos y el total de memoria consumida."""
    models = list(LOADED_MODELS.values())
    total_vram = round(sum(m.get("vram_gb", 0.0) for m in models), 2)
    total_ram = round(sum(m.get("ram_gb", 0.0) for m in models), 2)

    return {
        "count": len(models),
        "total_vram_gb": total_vram,
        "total_ram_gb": total_ram,
        "models": models,
    }


def eject_loaded_model(model_id: str) -> Dict[str, Any]:
    """Eyecta un modelo específico y purga la memoria GPU/RAM."""
    if model_id in LOADED_MODELS:
        del LOADED_MODELS[model_id]

    # Forzar recolección de basura y vaciado de caché CUDA
    gc.collect()
    if torch is not None and torch.cuda.is_available():
        try:
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        except Exception:
            pass

    return {
        "status": "success",
        "ejected_id": model_id,
        "remaining": list_loaded_models(),
    }


def eject_all_models() -> Dict[str, Any]:
    """Eyecta todos los modelos activos para liberar la GPU por completo."""
    LOADED_MODELS.clear()
    gc.collect()
    if torch is not None and torch.cuda.is_available():
        try:
            torch.cuda.empty_cache()
        except Exception:
            pass
    return {"status": "success", "message": "Todos los modelos fueron eyectados"}
