"""Posicionamiento radial de nodos por clusters semanticos.

Coloca clusters (tipos de nodo) en anillos concéntricos y distribuye
los nodos de cada cluster en un arco circular dentro de su anillo.
"""

import math
import random
from collections import defaultdict
from typing import Any

# Orden canónico de anillos (de adentro hacia afuera)
_RING_ORDER = [
    "concepto",     # centro — conceptos generales
    "norma",        # normativa
    "zona",         # zonas geográficas
    "capa",         # capas SIG
    "documento",    # documentos fuente
    "chat_turn",    # conversaciones
    "web_search",   # búsquedas web
    "upload",       # subidas
    "connector",    # conectores externos
    "rag_recall",   # RAG recall
]


def reset_counters() -> None:
    """No-op en el layout radial (los contadores no son necesarios)."""
    pass


def compute_node_positions(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]] | None = None,
    center_x: float = 50.0,
    center_y: float = 50.0,
    max_radius: float = 45.0,
    jitter: float = 1.5,
) -> dict[str, dict[str, float]]:
    """Asigna posiciones (x, y) usando layout radial por clusters.

    Args:
        nodes: lista de dicts con al menos 'id' y 'kind'.
        edges: lista de aristas (opcional, para detectar nodos aislados).
        center_x, center_y: centro del canvas (porcentaje 0-100).
        max_radius: radio máximo desde el centro.
        jitter: desplazamiento aleatorio máximo para evitar solapamiento.

    Returns:
        dict { node_id: {x, y} } en coordenadas porcentuales (0-100).
    """
    clusters: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for n in nodes:
        clusters[n.get("kind", "concepto")].append(n)

    # Determinar radio por cluster según orden canónico
    kind_radius: dict[str, float] = {}
    used = set()
    total_kinds = sum(1 for k in _RING_ORDER if k in clusters)
    remaining_kinds = [k for k in clusters if k not in _RING_ORDER]

    for idx, kind in enumerate(_RING_ORDER):
        if kind in clusters:
            frac = (idx + 1) / (total_kinds + 1) if total_kinds > 0 else 0.5
            kind_radius[kind] = max(8.0, frac * max_radius)
            used.add(kind)

    idx = total_kinds
    for kind in remaining_kinds:
        idx += 1
        frac = (idx + 1) / (idx + 1)
        kind_radius[kind] = min(max_radius, 15.0 + idx * 6.0)

    positions: dict[str, dict[str, float]] = {}
    for kind, kind_nodes in clusters.items():
        n = len(kind_nodes)
        if n == 0:
            continue
        radius = kind_radius.get(kind, 30.0)

        for i, node in enumerate(kind_nodes):
            angle_offset = random.uniform(-0.05, 0.05)
            angle = (2.0 * math.pi * i / max(n, 1)) + angle_offset

            r = radius + random.uniform(-jitter, jitter)
            x = center_x + r * math.cos(angle)
            y = center_y + r * math.sin(angle)

            positions[node["id"]] = {
                "x": round(max(0.0, min(100.0, x)), 2),
                "y": round(max(0.0, min(100.0, y)), 2),
            }

    return positions


def node_position_by_kind(
    kind: str,
    regions: dict[str, dict[str, tuple[float, float]]] | None = None,
) -> tuple[float, float]:
    """Asigna posicion por tipo usando layout radial simple."""
    ring_radius = {
        "concepto": 10, "norma": 18, "zona": 25, "capa": 32,
        "documento": 38, "chat_turn": 42, "web_search": 45,
        "upload": 45, "connector": 45, "rag_recall": 45,
    }.get(kind, 30.0)

    # Ángulo pseudo-aleatorio determinista basado en kind
    angle = hash(kind) % 360 * math.pi / 180.0
    x = 50.0 + ring_radius * math.cos(angle)
    y = 50.0 + ring_radius * math.sin(angle)
    return (round(x, 2), round(y, 2))
