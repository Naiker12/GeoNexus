import random
import re
from typing import Dict, List


CONCEPT_DESCRIPTIONS = {
    "retiro hidrico": "Franja de proteccion ambiental alrededor de corrientes de agua.",
    "ronda de proteccion": "Area de amortiguacion ecologica para cauces y riberas.",
    "uso industrial": "Clasificacion de actividades industriales en ordenamiento territorial.",
    "zonificacion": "Division territorial que asigna usos, densidades y obligaciones.",
    "drenaje": "Sistema de escurrimiento pluvial y control de inundaciones.",
}


def extract_graph_entities(chunks: List[Dict], project_id: str, workspace_id: str) -> Dict:
    """Extrae nodos y relaciones simples desde texto real indexado."""
    nodes: dict[str, Dict] = {}
    edges: list[Dict] = []

    for chunk in chunks:
        content = chunk["content"]
        page = chunk["page_number"]
        evidence_ref = f"pagina {page}"
        chunk_nodes: list[str] = []

        for article in re.findall(r"(?:Art\.|Articulo|Artículo)\s*(\d+)", content, re.IGNORECASE):
            node_id = f"norma-art-{article}"
            if node_id not in nodes:
                nodes[node_id] = {
                    "id": node_id,
                    "project_id": project_id,
                    "workspace_id": workspace_id,
                    "name": f"Art. {article}",
                    "kind": "norma",
                    "description": f"Articulo {article} detectado en el texto.",
                    "evidence": evidence_ref,
                    "x": round(random.uniform(20, 80), 2),
                    "y": round(random.uniform(20, 80), 2),
                    "weight": 2,
                }
            chunk_nodes.append(node_id)

        for zone in re.findall(r"(?:Zona|Sector)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)", content):
            zone_name = f"Zona {zone}"
            node_id = f"zona-{zone_name.lower().replace(' ', '-')}"
            if node_id not in nodes:
                nodes[node_id] = {
                    "id": node_id,
                    "project_id": project_id,
                    "workspace_id": workspace_id,
                    "name": zone_name,
                    "kind": "zona",
                    "description": f"Zona o sector territorial detectado: {zone_name}.",
                    "evidence": evidence_ref,
                    "x": round(random.uniform(20, 80), 2),
                    "y": round(random.uniform(20, 80), 2),
                    "weight": 3,
                }
            chunk_nodes.append(node_id)

        for concept, description in CONCEPT_DESCRIPTIONS.items():
            if re.search(rf"\b{concept}\b", content, re.IGNORECASE):
                node_id = f"concepto-{concept.replace(' ', '-')}"
                if node_id not in nodes:
                    nodes[node_id] = {
                        "id": node_id,
                        "project_id": project_id,
                        "workspace_id": workspace_id,
                        "name": concept.capitalize(),
                        "kind": "concepto",
                        "description": description,
                        "evidence": evidence_ref,
                        "x": round(random.uniform(20, 80), 2),
                        "y": round(random.uniform(20, 80), 2),
                        "weight": 2,
                    }
                chunk_nodes.append(node_id)

        for source, target in _cooccurring_pairs(chunk_nodes):
            edge_id = f"edge-{source}-{target}"
            if any(edge["id"] == edge_id for edge in edges):
                continue
            edges.append(
                {
                    "id": edge_id,
                    "project_id": project_id,
                    "source": source,
                    "target": target,
                    "relation": _relation_for(nodes[source]["kind"], nodes[target]["kind"]),
                    "strength": 80,
                }
            )

    if not nodes:
        doc_node_id = f"doc-{project_id}"
        nodes[doc_node_id] = {
            "id": doc_node_id,
            "project_id": project_id,
            "workspace_id": workspace_id,
            "name": "Documento indexado",
            "kind": "documento",
            "description": "Nodo principal que representa al documento indexado.",
            "evidence": "Registro en inventario",
            "x": 50.0,
            "y": 50.0,
            "weight": 2,
            "created_at": 0,
        }

    return {"nodes": list(nodes.values()), "edges": edges}


def _cooccurring_pairs(node_ids: list[str]) -> list[tuple[str, str]]:
    unique = sorted(set(node_ids))
    return [(unique[i], unique[j]) for i in range(len(unique)) for j in range(i + 1, len(unique))]


def _relation_for(source_kind: str, target_kind: str) -> str:
    kinds = {source_kind, target_kind}
    if kinds == {"norma", "zona"}:
        return "aplica en"
    if kinds == {"norma", "concepto"}:
        return "define"
    if kinds == {"concepto", "zona"}:
        return "afecta"
    return "asociado con"
