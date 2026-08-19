"""GeoNexus AI Hub — Hugging Face Discover & Model Search.

Consulta la API pública de Hugging Face (`https://huggingface.co/api/models`)
con filtrado por tareas (text-generation, text-to-image), ordenamiento y
evaluación en tiempo real del ajuste de VRAM para cada variante GGUF/Safetensors.
"""

import json
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional
from core.hub.vram_fit import calculate_vram_fit, get_hardware_memory


def search_hf_models(
    query: str = "",
    task: str = "text-generation",
    sort: str = "downloads",
    direction: int = -1,
    limit: int = 15,
) -> Dict[str, Any]:
    """Busca modelos en Hugging Face Hub y calcula si entran en la memoria del equipo."""
    hardware = get_hardware_memory()
    base_url = "https://huggingface.co/api/models"

    params = {
        "search": query,
        "filter": task if task else "text-generation",
        "sort": sort,
        "direction": str(direction),
        "limit": str(limit),
        "full": "false",
    }
    encoded_params = urllib.parse.urlencode({k: v for k, v in params.items() if v})
    url = f"{base_url}?{encoded_params}"

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "GeoNexus-AI-Hub/1.0", "Accept": "application/json"},
    )

    models_out: List[Dict[str, Any]] = []

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            if response.status == 200:
                raw_data = json.loads(response.read().decode("utf-8"))
                for item in raw_data:
                    model_id = item.get("id", "")
                    pipeline_tag = item.get("pipeline_tag") or task
                    downloads = item.get("downloads", 0)
                    likes = item.get("likes", 0)
                    tags = item.get("tags", [])
                    has_remote_code = "custom_code" in tags or "remote_code" in tags

                    # Generar variantes representativas para GGUF o Safetensors
                    variants = _generate_variants(model_id, tags, hardware)

                    models_out.append({
                        "id": model_id,
                        "name": model_id.split("/")[-1] if "/" in model_id else model_id,
                        "author": model_id.split("/")[0] if "/" in model_id else "community",
                        "downloads": downloads,
                        "likes": likes,
                        "task": pipeline_tag,
                        "tags": tags[:6],
                        "has_remote_code": has_remote_code,
                        "gated": item.get("gated", False),
                        "variants": variants,
                    })
    except Exception as e:
        # Fallback offline con modelos populares conocidos
        models_out = _get_offline_fallback_models(query, hardware)

    return {
        "query": query,
        "total": len(models_out),
        "models": models_out,
        "hardware": hardware,
    }


def _generate_variants(model_id: str, tags: List[str], hardware: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Estima variantes de cuantización comunes según los tags o nombre del modelo."""
    is_gguf = "gguf" in tags or "gguf" in model_id.lower()
    
    # Estimación de tamaño base según parámetros en el nombre (7b, 14b, 3b, 70b)
    name_lower = model_id.lower()
    base_size = 4.5
    if "70b" in name_lower:
        base_size = 38.0
    elif "32b" in name_lower or "27b" in name_lower:
        base_size = 18.0
    elif "14b" in name_lower:
        base_size = 8.5
    elif "8b" in name_lower or "7b" in name_lower:
        base_size = 4.8
    elif "3b" in name_lower:
        base_size = 2.2
    elif "1b" in name_lower or "0.5b" in name_lower:
        base_size = 0.9

    if is_gguf:
        var_specs = [
            ("Q4_K_M", base_size * 0.95, "Equilibrio ideal velocidad / calidad"),
            ("Q8_0", base_size * 1.75, "Alta precisión / calidad máxima"),
            ("Q5_K_M", base_size * 1.15, "Precisión intermedia"),
            ("IQ3_M", base_size * 0.72, "Ultra compacto para baja VRAM"),
        ]
    else:
        var_specs = [
            ("Safetensors (FP16)", base_size * 2.0, "Pesos nativos PyTorch / Safetensors"),
            ("4-bit NF4", base_size * 0.85, "Cuantización bitsandbytes"),
        ]

    variants = []
    for q_name, size_gb, desc in var_specs:
        rounded_size = round(size_gb, 2)
        fit = calculate_vram_fit(rounded_size, context_tokens=4096, hardware=hardware)
        variants.append({
            "name": q_name,
            "filename": f"{model_id.split('/')[-1].lower()}-{q_name.lower().replace('_', '-')}.{ 'gguf' if is_gguf else 'safetensors' }",
            "size_gb": rounded_size,
            "description": desc,
            "fits_vram": fit["fits_vram"],
            "fits_ram": fit["fits_ram"],
            "fit_level": fit["fit_level"],
            "required_vram_gb": fit["required_vram_gb"],
        })

    return variants


def _get_offline_fallback_models(query: str, hardware: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Catálogo offline curado cuando no hay conexión externa inmediata."""
    curated = [
        {
            "id": "unsloth/Qwen2.5-Coder-7B-Instruct-GGUF",
            "name": "Qwen2.5-Coder-7B-Instruct-GGUF",
            "author": "unsloth",
            "downloads": 182400,
            "likes": 980,
            "task": "text-generation",
            "tags": ["gguf", "code", "qwen2.5", "instruct"],
            "has_remote_code": False,
            "gated": False,
        },
        {
            "id": "meta-llama/Llama-3.2-3B-Instruct",
            "name": "Llama-3.2-3B-Instruct",
            "author": "meta-llama",
            "downloads": 420000,
            "likes": 2100,
            "task": "text-generation",
            "tags": ["llama3", "instruct", "lightweight"],
            "has_remote_code": False,
            "gated": False,
        },
        {
            "id": "black-forest-labs/FLUX.1-schnell",
            "name": "FLUX.1-schnell",
            "author": "black-forest-labs",
            "downloads": 295000,
            "likes": 1850,
            "task": "text-to-image",
            "tags": ["flux", "text-to-image", "diffusion", "fast"],
            "has_remote_code": False,
            "gated": False,
        },
        {
            "id": "stabilityai/stable-diffusion-xl-base-1.0",
            "name": "stable-diffusion-xl-base-1.0",
            "author": "stabilityai",
            "downloads": 680000,
            "likes": 3400,
            "task": "text-to-image",
            "tags": ["sdxl", "text-to-image", "diffusion"],
            "has_remote_code": False,
            "gated": False,
        }
    ]

    filtered = [
        m for m in curated
        if not query or query.lower() in m["id"].lower() or query.lower() in m["name"].lower()
    ]

    for m in filtered:
        m["variants"] = _generate_variants(m["id"], m["tags"], hardware)

    return filtered
