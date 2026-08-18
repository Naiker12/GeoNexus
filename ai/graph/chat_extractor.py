"""Extrae entidades del grafo desde texto del chat (pregunta + respuesta).

Extraccion generalista, NO limitada a dominio territorial:
  - Terminos con mayuscula (multi-word: "Machine Learning", "Analisis de Datos")
  - Acronimos (3-5 letras mayusculas: "API", "SQL", "POT")
  - Tecnologias y lenguajes comunes
  - Patrones de definicion ("X es un...", "se llama X")
  - Regex exactos (Art., Zona, conceptos del diccionario)
"""

import re
from typing import Dict, List

from .extractor import _relation_for, _seed_position


# Tecnologias/lenguajes comunes (cualquier dominio tecnologico)
COMMON_TECH_KEYWORDS: list[dict] = [
    {"name": "Python", "weight": 2},
    {"name": "JavaScript", "weight": 2},
    {"name": "TypeScript", "weight": 2},
    {"name": "React", "weight": 2},
    {"name": "Node.js", "weight": 2},
    {"name": "Rust", "weight": 2},
    {"name": "SQL", "weight": 2},
    {"name": "Docker", "weight": 2},
    {"name": "Git", "weight": 2},
    {"name": "API", "weight": 2},
    {"name": "REST", "weight": 2},
    {"name": "GraphQL", "weight": 2},
    {"name": "HTML", "weight": 2},
    {"name": "CSS", "weight": 2},
    {"name": "Machine Learning", "weight": 3},
    {"name": "Deep Learning", "weight": 3},
    {"name": "Inteligencia Artificial", "weight": 3},
    {"name": "IA", "weight": 3},
    {"name": "Base de Datos", "weight": 2},
    {"name": "Algoritmo", "weight": 2},
]

# Stop-words: frases genericas que NO deben ser nodos
STOP_PHRASES = {
    "hola", "gracias", "buenos dias", "buenas tardes", "buenas noches",
    "por favor", "disculpa", "disculpe", "oye", "mira", "claro",
    "exacto", "correcto", "perfecto", "listo", "vale", "ok", "si",
    "no", "como estas", "bien", "mal", "saludos", "solo",
}

# Palabras interrogativas y genericas que NO deben capturarse como definiciones
STOP_DEFINITIONS = {
    "cual", "cuales", "que", "quien", "quienes", "como", "donde",
    "cuando", "cuanto", "cuanta", "cuantos", "cuantas",
    "este", "esta", "esto", "ese", "esa", "eso", "aquel", "aquella",
    "ello", "ella", "ellos", "ellas",
}


def extract_chat_entities(
    text: str,
    project_id: str,
    workspace_id: str,
) -> Dict:
    """Extrae nodos y aristas desde texto plano de cualquier dominio.

    Niveles de extraccion:
      1. Patrones de definicion ("Y es...", "se llama X")
      2. Acronimos (3+ mayusculas)
      3. Terminos multi-word con mayuscula inicial
      4. Tecnologias/lenguajes comunes
      5. Regex de articulos/zonas (opcional, para compatibilidad)
    """
    from .layout import reset_counters as _reset
    _reset()
    nodes: dict[str, Dict] = {}
    edges: list[Dict] = []
    evidence = "extraido del chat"

    seen_names: set[str] = set()

    def add_node(name: str, kind: str = "concepto", desc: str = "", weight: int = 2) -> str:
        nonlocal seen_names
        name_stripped = name.strip().strip("¿?¡!.,;:")
        lower = name_stripped.lower()
        if not name_stripped or lower in STOP_PHRASES or lower in STOP_DEFINITIONS:
            return ""
        if lower in seen_names:
            return ""
        seen_names.add(name_stripped.lower())
        slug = name_stripped.lower().replace(" ", "-").replace("/", "-")
        # Limpiar caracteres no alfanumericos
        slug = re.sub(r"[^a-z0-9\-]", "", slug)
        node_id = f"chat-{slug}"
        if node_id not in nodes:
            nodes[node_id] = {
                "id": node_id, "project_id": project_id, "workspace_id": workspace_id,
                "name": name_stripped, "kind": kind,
                "description": desc or f"Concepto mencionado en chat: {name_stripped}.",
                "evidence": evidence,
                "x": _seed_position(kind)[0], "y": _seed_position(kind)[1],
                "weight": weight,
            }
        return node_id

    # === Nivel 1: Patrones de definicion ("X es un/una...", "se llama X") ===
    # "Machine Learning es un..." → captura "Machine Learning"
    for m in re.finditer(
        r'([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3})\s+es\s+(?:un|una|el|la)',
        text,
    ):
        add_node(m.group(1).strip(), weight=3)

    for m in re.finditer(
        r'(?:[Ss]e\s+(?:llama|conoce\s+como|denomina)\s+)([A-ZÁÉÍÓÚÑ][a-zA-Záéíóúñ]+(?:\s+[a-zA-Záéíóúñ]+){0,3})',
        text,
    ):
        add_node(m.group(1).strip(), weight=3)

    # === Nivel 2: Acronimos (3-6 letras mayusculas, standalone) ===
    ACRONYM_STOP = {"QUE", "POR", "PARA", "LOS", "LAS", "CON", "SIN", "DEL", "EL", "LA",
                    "LLE", "ERA", "SUS", "HAN", "HAY", "TAL", "TAN", "MAS", "PERO",
                    "ESTE", "ESTA", "TODO", "CADA", "OTRO", "ENTRE", "DONDE", "QUIEN"}
    for m in re.finditer(r'(?:^|\s)([A-Z]{3,6})(?:\s|$|[.,;!?])', text):
        acro = m.group(1)
        if acro not in ACRONYM_STOP and len(acro) >= 2:
            add_node(acro, weight=2)

    # === Nivel 3: Terminos multi-word con mayuscula inicial (2-5 palabras) ===
    # Palabras que indican que NO es un nombre propio (articulos, preposiciones)
    _skip_next = {"del", "de", "la", "el", "los", "las", "un", "una", "al", "por", "para", "con", "sin", "entre"}
    for m in re.finditer(
        r'(?:^|(?<=[.!?]\s)|(?<=\s))([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})(?=\s|$|[.,;!?])',
        text,
    ):
        phrase = m.group(1)
        # Saltar si empieza con preposicion/articulo (no es nombre propio real)
        first_word = phrase.split()[0].lower()
        if first_word in _skip_next:
            continue
        if phrase.lower() not in seen_names:
            add_node(phrase, weight=3)

    # === Nivel 4: Tecnologias/lenguajes comunes ===
    text_lower = text.lower()
    for tech in COMMON_TECH_KEYWORDS:
        if re.search(rf"\b{re.escape(tech['name'].lower())}\b", text_lower):
            add_node(tech["name"], weight=tech["weight"])

    # === Nivel 5: Regex de compatibilidad (Articulos, Zonas) ===
    for article in re.findall(r"(?:Art\.|Articulo|Artículo)\s*(\d+)", text, re.IGNORECASE):
        add_node(f"Art. {article}", kind="norma",
                 desc=f"Articulo {article} mencionado en chat.", weight=2)

    for zone in re.findall(r"(?:Zona|Sector)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)", text):
        zone_name = f"Zona {zone}"
        add_node(zone_name, kind="zona",
                 desc=f"Zona o sector mencionado en chat: {zone_name}.", weight=3)

    # === Aristas ===
    chunk_ids = list(nodes.keys())
    for source, target in _cooccurring_pairs(chunk_ids):
        edge_id = f"chat-edge-{source}-{target}"
        if any(edge["id"] == edge_id for edge in edges):
            continue
        edges.append({
            "id": edge_id, "project_id": project_id,
            "source": source, "target": target,
            "relation": _relation_for(nodes[source]["kind"], nodes[target]["kind"]),
            "strength": 50,
        })

    return {"nodes": list(nodes.values()), "edges": edges}


def _cooccurring_pairs(node_ids: list[str]) -> list[tuple[str, str]]:
    unique = sorted(set(node_ids))
    return [
        (unique[i], unique[j])
        for i in range(len(unique))
        for j in range(i + 1, len(unique))
    ]
