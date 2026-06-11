"""Posicionamiento inteligente de nodos por tipo en el canvas.

Divide el canvas en regiones semanticas segun el tipo de nodo,
distribuye uniformemente con pequeño jitter aleatorio.
"""

import random
from typing import Dict


# Contadores por tipo para distribucion uniforme
_kind_counters: dict[str, int] = {}


def reset_counters() -> None:
    """Reinicia contadores (llamar al inicio de cada extraccion)."""
    _kind_counters.clear()


def node_position_by_kind(
    kind: str,
    regions: Dict[str, Dict[str, tuple[float, float]]],
) -> tuple[float, float]:
    """Asigna posicion dentro de la region del tipo, distribuyendo uniformemente.

    Args:
        kind: tipo de nodo ("norma", "zona", "concepto", "documento", "capa")
        regions: dict con x_range y y_range por tipo

    Returns:
        (x, y) coordenadas en porcentaje (0-100)
    """
    _kind_counters[kind] = _kind_counters.get(kind, 0) + 1
    idx = _kind_counters[kind]

    region = regions.get(kind, {"x_range": (20, 80), "y_range": (20, 80)})
    x_min, x_max = region["x_range"]
    y_min, y_max = region["y_range"]

    x_span = x_max - x_min
    y_span = y_max - y_min

    cols = max(1, int((x_span / y_span) * 3)) if y_span > 0 else 3
    total = idx

    row = (total - 1) // cols
    col = (total - 1) % cols

    cell_w = x_span / max(cols, 1)
    cell_h = y_span / max(cols, 1)

    x = x_min + col * cell_w + cell_w * 0.5 + random.uniform(-2, 2)
    y = y_min + row * cell_h + cell_h * 0.5 + random.uniform(-2, 2)

    return (round(clamp(x, x_min, x_max), 2), round(clamp(y, y_min, y_max), 2))


def clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))
