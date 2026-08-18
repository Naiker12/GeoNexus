"""Curated memory store — curated, LLM-curated facts about the project/user.

Unlike raw vector embeddings, curated memory stores structured facts that have
been explicitly extracted and validated by the LLM. Entries are periodically
reviewed, consolidated, and pruned by the agent itself.

Schema:
  - id: UUID
  - fact: str (the curated fact, e.g. "El proyecto usa PostgreSQL 15 como BD principal")
  - category: str (one of: project, user, tech, decision, goal, constraint)
  - source: str (conversation_id or manual)
  - confidence: float (0.0–1.0)
  - created_at: int (unix ts)
  - updated_at: int (unix ts)
  - access_count: int
  - tags: list[str]
"""

import json
import sqlite3
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class CuratedFact:
    id: str
    fact: str
    category: str
    source: str
    confidence: float
    created_at: int
    updated_at: int
    access_count: int
    tags: list[str] = field(default_factory=list)


FACT_CATEGORIES = {"project", "user", "tech", "decision", "goal", "constraint"}


class CuratedMemoryStore:
    """SQLite-backed store for curated facts."""

    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self.db_path))
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self):
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS curated_memory (
                id          TEXT PRIMARY KEY,
                fact        TEXT NOT NULL,
                category    TEXT NOT NULL DEFAULT 'project',
                source      TEXT NOT NULL DEFAULT 'manual',
                confidence  REAL NOT NULL DEFAULT 1.0,
                created_at  INTEGER NOT NULL,
                updated_at  INTEGER NOT NULL,
                access_count INTEGER NOT NULL DEFAULT 0,
                tags_json   TEXT NOT NULL DEFAULT '[]'
            );
            CREATE INDEX IF NOT EXISTS idx_curated_memory_category
                ON curated_memory(category);
            CREATE INDEX IF NOT EXISTS idx_curated_memory_confidence
                ON curated_memory(confidence DESC);
            CREATE INDEX IF NOT EXISTS idx_curated_memory_updated
                ON curated_memory(updated_at DESC);
        """)
        self._conn.commit()

    def add_fact(
        self,
        fact: str,
        category: str = "project",
        source: str = "manual",
        confidence: float = 1.0,
        tags: Optional[list[str]] = None,
    ) -> CuratedFact:
        """Insert or update a fact (matched by exact text)."""
        if category not in FACT_CATEGORIES:
            raise ValueError(f"Categoria invalida: {category}. Usar una de: {FACT_CATEGORIES}")
        now = int(time.time())
        fact_id = str(uuid.uuid4())
        tags_json = json.dumps(tags or [])

        # Deduplicate by fact text — update if exists
        existing = self._conn.execute(
            "SELECT id FROM curated_memory WHERE fact = ?", (fact,)
        ).fetchone()

        if existing:
            fact_id = existing["id"]
            self._conn.execute(
                """UPDATE curated_memory
                   SET category = ?, confidence = ?, tags_json = ?,
                       updated_at = ?, access_count = access_count + 1
                   WHERE id = ?""",
                (category, confidence, tags_json, now, fact_id),
            )
        else:
            self._conn.execute(
                """INSERT INTO curated_memory
                   (id, fact, category, source, confidence, created_at, updated_at, tags_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (fact_id, fact, category, source, confidence, now, now, tags_json),
            )

        self._conn.commit()
        return self.get_fact(fact_id)

    def get_fact(self, fact_id: str) -> CuratedFact:
        row = self._conn.execute(
            "SELECT * FROM curated_memory WHERE id = ?", (fact_id,)
        ).fetchone()
        if not row:
            raise KeyError(f"Fact {fact_id} not found")
        return self._row_to_fact(row)

    def search_facts(
        self,
        query: str,
        category: Optional[str] = None,
        min_confidence: float = 0.0,
        limit: int = 20,
    ) -> list[CuratedFact]:
        sql = "SELECT * FROM curated_memory WHERE confidence >= ?"
        params: list = [min_confidence]

        if category:
            sql += " AND category = ?"
            params.append(category)

        if query.strip():
            like = f"%{query}%"
            sql += " AND (fact LIKE ? OR tags_json LIKE ?)"
            params.extend([like, like])

        sql += " ORDER BY confidence DESC, updated_at DESC LIMIT ?"
        params.append(limit)

        rows = self._conn.execute(sql, params).fetchall()
        return [self._row_to_fact(r) for r in rows]

    def list_facts(
        self,
        category: Optional[str] = None,
        limit: int = 50,
    ) -> list[CuratedFact]:
        if category:
            rows = self._conn.execute(
                "SELECT * FROM curated_memory WHERE category = ? ORDER BY updated_at DESC LIMIT ?",
                (category, limit),
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM curated_memory ORDER BY updated_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [self._row_to_fact(r) for r in rows]

    def update_fact(
        self,
        fact_id: str,
        fact: Optional[str] = None,
        category: Optional[str] = None,
        confidence: Optional[float] = None,
        tags: Optional[list[str]] = None,
    ) -> CuratedFact:
        now = int(time.time())
        sets = ["updated_at = ?"]
        params: list = [now]

        if fact is not None:
            sets.append("fact = ?")
            params.append(fact)
        if category is not None:
            if category not in FACT_CATEGORIES:
                raise ValueError(f"Invalid category: {category}")
            sets.append("category = ?")
            params.append(category)
        if confidence is not None:
            sets.append("confidence = ?")
            params.append(confidence)
        if tags is not None:
            sets.append("tags_json = ?")
            params.append(json.dumps(tags))

        params.append(fact_id)
        sql = f"UPDATE curated_memory SET {', '.join(sets)} WHERE id = ?"
        self._conn.execute(sql, params)
        self._conn.commit()
        return self.get_fact(fact_id)

    def delete_fact(self, fact_id: str) -> None:
        self._conn.execute("DELETE FROM curated_memory WHERE id = ?", (fact_id,))
        self._conn.commit()

    def increment_access(self, fact_id: str) -> None:
        self._conn.execute(
            "UPDATE curated_memory SET access_count = access_count + 1 WHERE id = ?",
            (fact_id,),
        )
        self._conn.commit()

    def regenerate_summary(self, model_callable) -> str:
        """Use an LLM callable to produce a concise summary of all facts."""
        facts = self.list_facts(limit=100)
        if not facts:
            return "No hay hechos curados almacenados."

        text = "\n".join(
            f"[{f.category}] {f.fact} (confianza: {f.confidence:.2f})"
            for f in facts
        )
        prompt = (
            "Resume los siguientes hechos curados del proyecto/usuario "
            "en un parrafo conciso. Identifica patrones, decisiones clave y objetivos:\n\n"
            f"{text}"
        )
        return model_callable(prompt)

    def _row_to_fact(self, row: sqlite3.Row) -> CuratedFact:
        return CuratedFact(
            id=row["id"],
            fact=row["fact"],
            category=row["category"],
            source=row["source"],
            confidence=row["confidence"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            access_count=row["access_count"],
            tags=json.loads(row["tags_json"]),
        )

    def close(self):
        self._conn.close()
