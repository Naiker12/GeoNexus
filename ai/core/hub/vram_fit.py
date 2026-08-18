"""GeoNexus AI Hub — VRAM & RAM Fit Estimator.

Calcula con precisión si un modelo o variante cuantizada (GGUF / Safetensors)
cabe en la VRAM de la GPU o en la memoria RAM del sistema antes de descargarlo o cargarlo.
"""

import os
import sys
from typing import Any, Dict, Optional

try:
    import torch
except ImportError:
    torch = None

try:
    import psutil
except ImportError:
    psutil = None


def get_hardware_memory() -> Dict[str, Any]:
    """Obtiene la memoria física total y disponible del sistema y de la GPU."""
    gpu_total_gb = 0.0
    gpu_free_gb = 0.0
    gpu_name = "CPU Only"
    has_gpu = False

    if torch is not None and torch.cuda.is_available():
        has_gpu = True
        try:
            device = torch.cuda.current_device()
            gpu_name = torch.cuda.get_device_name(device)
            # Memoria en bytes convertida a GB
            free_b, total_b = torch.cuda.mem_get_info(device)
            gpu_total_gb = round(total_b / (1024 ** 3), 2)
            gpu_free_gb = round(free_b / (1024 ** 3), 2)
        except Exception:
            pass

    ram_total_gb = 16.0
    ram_free_gb = 8.0
    if psutil is not None:
        try:
            mem = psutil.virtual_memory()
            ram_total_gb = round(mem.total / (1024 ** 3), 2)
            ram_free_gb = round(mem.available / (1024 ** 3), 2)
        except Exception:
            pass

    return {
        "has_gpu": has_gpu,
        "gpu_name": gpu_name,
        "gpu_total_gb": gpu_total_gb,
        "gpu_free_gb": gpu_free_gb,
        "ram_total_gb": ram_total_gb,
        "ram_free_gb": ram_free_gb,
    }


def calculate_vram_fit(
    model_size_gb: float,
    context_tokens: int = 4096,
    format_type: str = "gguf",
    hardware: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Calcula si el modelo entra en VRAM o RAM.
    
    Fórmula:
      VRAM base = model_size_gb * 1.12 (overhead de pesos y tensores)
      KV Cache = (context_tokens / 1024) * 0.25 GB
      Overhead runtime = 0.5 GB
    """
    if hardware is None:
        hardware = get_hardware_memory()

    kv_cache_gb = (context_tokens / 1024.0) * 0.25
    runtime_overhead_gb = 0.5

    required_vram_gb = round((model_size_gb * 1.12) + kv_cache_gb + runtime_overhead_gb, 2)
    required_ram_gb = round((model_size_gb * 1.15) + runtime_overhead_gb, 2)

    fits_vram = False
    fits_ram = False
    fit_level = "cpu_only"  # "full_vram" | "partial_vram" | "ram_only" | "exceeds"

    if hardware["has_gpu"] and hardware["gpu_free_gb"] > 0:
        if hardware["gpu_free_gb"] >= required_vram_gb:
            fits_vram = True
            fit_level = "full_vram"
        elif hardware["gpu_free_gb"] >= (required_vram_gb * 0.45):
            fit_level = "partial_vram"
        else:
            fit_level = "ram_only"
    else:
        fit_level = "ram_only"

    if hardware["ram_free_gb"] >= required_ram_gb:
        fits_ram = True
    else:
        if fit_level == "ram_only":
            fit_level = "exceeds"

    return {
        "fits_vram": fits_vram,
        "fits_ram": fits_ram,
        "fit_level": fit_level,
        "required_vram_gb": required_vram_gb,
        "required_ram_gb": required_ram_gb,
        "gpu_free_gb": hardware["gpu_free_gb"],
        "ram_free_gb": hardware["ram_free_gb"],
        "gpu_name": hardware["gpu_name"],
    }
