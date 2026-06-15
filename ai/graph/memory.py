"""Algoritmo de memoria para el grafo de conocimiento.

Basado en la curva de olvido de Ebbinghaus:
- Nodos usados frecuentemente se refuerzan (weight sube)
- Nodos no usados decaen con el tiempo
- Nodos pinned nunca olvidan
"""

import math
from datetime import datetime
from typing import Any


def compute_memory_score(
    node: dict[str, Any],
    now: datetime | None = None,
) -> float:
    """Calcula el score de memoria de un nodo (0.1 - 10+).

    Combina: peso base + frecuencia de uso + recencia + decay temporal.
    """
    if now is None:
        now = datetime.utcnow()

    base_weight = max(0, node.get("weight", 1))
    created_at = _parse_dt(node.get("created_at", now.isoformat()))
    last_used_at = node.get("last_used_at")
    use_count = max(0, node.get("use_count", 0))
    pinned = node.get("pinned", False)

    age_days = max(0, (now - created_at).total_seconds() / 86400)

    if last_used_at:
        days_since_use = max(0, (now - _parse_dt(last_used_at)).total_seconds() / 86400)
    else:
        days_since_use = age_days

    # Decay: Ebbinghaus forgetting curve R = e^(-t/S)
    stability = max(1.0, float(base_weight) * 2.0)
    decay_factor = math.exp(-days_since_use / stability)

    # Frequency bonus: logarithmic so heavily used nodes have diminishing returns
    frequency_bonus = math.log(use_count + 1) * 0.5

    score = (float(base_weight) * decay_factor) + frequency_bonus

    # Pinned nodes never go below 5
    if pinned:
        score = max(score, 5.0)

    return round(max(score, 0.1), 2)


def should_show_node(
    node: dict[str, Any] | None,
    score: float | None = None,
    threshold: float = 0.3,
) -> bool:
    """Determina si un nodo debe ser visible en el grafo."""
    if node is None:
        return False
    if node.get("pinned"):
        return True
    if score is None:
        score = compute_memory_score(node)
    return score >= threshold


def decay_weight(
    current_weight: int,
    use_count: int,
    days_since_use: float,
) -> int:
    """Calcula el nuevo weight tras aplicar decay."""
    stability = max(1.0, float(current_weight) * 2.0)
    decay = math.exp(-days_since_use / stability)
    bonus = math.log(use_count + 1) * 0.5
    new_weight = int(round((float(current_weight) * decay) + bonus))
    return max(1, new_weight)


def _parse_dt(val: str | float | int) -> datetime:
    if isinstance(val, (int, float)):
        return datetime.fromtimestamp(val)
    try:
        return datetime.fromisoformat(val)
    except (ValueError, TypeError):
        return datetime.utcnow()
