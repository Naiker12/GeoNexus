import json
import math
import os
import sys
import hashlib
import random
from typing import Optional

EMBED_CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", ".fs_embed_cache")


def _ensure_cache_dir():
    os.makedirs(EMBED_CACHE_DIR, exist_ok=True)


def _cache_path(file_path: str) -> str:
    h = hashlib.sha256(file_path.encode()).hexdigest()[:16]
    return os.path.join(EMBED_CACHE_DIR, f"{h}.json")


def _deterministic_embedding(text: str, dim: int = 384) -> list[float]:
    h = hashlib.sha256(text.encode("utf-8"))
    seed = int(h.hexdigest(), 16) % (2**32)
    rng = random.Random(seed)
    vec = [rng.gauss(0, 1) for _ in range(dim)]
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec] if norm > 0 else vec


def _cosine_sim(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0


def cmd_index(file_path: str, content: str) -> dict:
    _ensure_cache_dir()
    vec = _deterministic_embedding(content)
    entry = {"path": file_path, "embedding": vec}
    cp = _cache_path(file_path)
    with open(cp, "w") as f:
        json.dump(entry, f)
    return {"status": "ok", "path": file_path, "dim": len(vec)}


def cmd_search(query: str, limit: int = 10) -> dict:
    _ensure_cache_dir()
    qvec = _deterministic_embedding(query)
    if not os.path.isdir(EMBED_CACHE_DIR):
        return {"status": "ok", "results": []}
    scored = []
    for fname in os.listdir(EMBED_CACHE_DIR):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(EMBED_CACHE_DIR, fname)
        try:
            with open(fpath) as f:
                entry = json.load(f)
        except Exception:
            continue
        sim = _cosine_sim(qvec, entry.get("embedding", []))
        scored.append((sim, entry["path"]))
    scored.sort(key=lambda x: x[0], reverse=True)
    results = [{"path": p, "score": round(s, 4)} for s, p in scored[:limit]]
    return {"status": "ok", "results": results}


def cmd_ping() -> dict:
    return {"status": "ok", "available": True, "cache_dir": EMBED_CACHE_DIR}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "subcommand required"}))
        sys.exit(1)

    sub = sys.argv[1]

    if sub == "ping":
        result = cmd_ping()
    elif sub == "index":
        if len(sys.argv) < 4:
            result = {"status": "error", "message": "Usage: fs_embed.py index <file_path> <content>"}
        else:
            result = cmd_index(sys.argv[2], sys.argv[3])
    elif sub == "search":
        query = sys.argv[2] if len(sys.argv) > 2 else ""
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10
        result = cmd_search(query, limit)
    else:
        result = {"status": "error", "message": f"unknown subcommand: {sub}"}

    print(json.dumps(result))
