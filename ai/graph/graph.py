"""Knowledge graph — operaciones de alto nivel sobre el grafo almacenado en SQLite."""

import sqlite3
from typing import Any


class KnowledgeGraph:
    """Operaciones de alto nivel sobre el grafo almacenado en SQLite."""

    def __init__(self, db_path: str):
        self.db_path = db_path

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def get_subgraph(self, node_ids: list[str]) -> dict[str, Any]:
        """Retorna nodos y aristas conectados a los node_ids dados."""
        if not node_ids:
            return {"nodes": [], "edges": []}
        placeholders = ",".join("?" for _ in node_ids)
        conn = self._connect()
        try:
            nodes = [
                dict(r) for r in conn.execute(
                    f"SELECT * FROM graph_nodes WHERE id IN ({placeholders})",
                    node_ids,
                ).fetchall()
            ]
            edges = [
                dict(r) for r in conn.execute(
                    f"""SELECT * FROM graph_edges
                        WHERE source IN ({placeholders})
                           OR target IN ({placeholders})""",
                    node_ids + node_ids,
                ).fetchall()
            ]
            return {"nodes": nodes, "edges": edges}
        finally:
            conn.close()

    def merge_duplicate_nodes(self, threshold: float = 0.85) -> int:
        """Fusiona nodos con labels similares. Retorna número de fusiones."""
        import difflib
        conn = self._connect()
        try:
            rows = conn.execute(
                "SELECT id, name FROM graph_nodes WHERE deleted_at IS NULL ORDER BY name"
            ).fetchall()
            merged = 0
            for i, row_a in enumerate(rows):
                for row_b in rows[i + 1:]:
                    ratio = difflib.SequenceMatcher(None, row_a["name"], row_b["name"]).ratio()
                    if ratio >= threshold:
                        conn.execute(
                            "UPDATE graph_edges SET source = ? WHERE source = ?",
                            (row_a["id"], row_b["id"]),
                        )
                        conn.execute(
                            "UPDATE graph_edges SET target = ? WHERE target = ?",
                            (row_a["id"], row_b["id"]),
                        )
                        conn.execute(
                            "UPDATE graph_nodes SET deleted_at = ? WHERE id = ?",
                            (int(__import__("time").time()), row_b["id"]),
                        )
                        merged += 1
            conn.commit()
            return merged
        finally:
            conn.close()
