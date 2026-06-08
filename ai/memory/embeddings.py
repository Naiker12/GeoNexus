import hashlib
import os
import random
import sys
from typing import Dict, List


def get_deterministic_embedding(text: str, dimension: int = 1536) -> List[float]:
    """Genera un vector unitario determinista basado en SHA-256."""
    hasher = hashlib.sha256(text.encode("utf-8"))
    seed = int(hasher.hexdigest(), 16) % (2**32)
    rng = random.Random(seed)
    vector = [rng.gauss(0, 1) for _ in range(dimension)]
    norm = sum(value * value for value in vector) ** 0.5
    return [value / norm for value in vector] if norm > 0 else vector


def generate_embeddings(chunks: List[Dict]) -> List[List[float]]:
    """Genera embeddings configurados; si no hay proveedor, usa fallback determinista."""
    embeddings: List[List[float]] = []
    openai_embedding_model = os.getenv("GEONEXUS_OPENAI_EMBEDDING_MODEL")
    ollama_embedding_model = os.getenv("GEONEXUS_OLLAMA_EMBEDDING_MODEL")
    ollama_embedding_url = os.getenv(
        "GEONEXUS_OLLAMA_EMBEDDING_URL",
        "http://localhost:11434/api/embeddings",
    )

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key and openai_embedding_model:
        try:
            import requests

            headers = {
                "Authorization": f"Bearer {openai_key}",
                "Content-Type": "application/json",
            }
            for chunk in chunks:
                response = requests.post(
                    "https://api.openai.com/v1/embeddings",
                    headers=headers,
                    json={"input": chunk["content"], "model": openai_embedding_model},
                    timeout=5,
                )
                if response.status_code != 200:
                    break
                embeddings.append(response.json()["data"][0]["embedding"])
        except Exception as exc:
            print(
                f"Error llamando a OpenAI embeddings, cayendo a local: {exc}",
                file=sys.stderr,
            )

    if len(embeddings) < len(chunks) and ollama_embedding_model:
        try:
            import requests

            embeddings = []
            for chunk in chunks:
                response = requests.post(
                    ollama_embedding_url,
                    json={"model": ollama_embedding_model, "prompt": chunk["content"]},
                    timeout=1.0,
                )
                if response.status_code != 200:
                    break
                embeddings.append(response.json()["embedding"])
        except Exception:
            embeddings = []

    if len(embeddings) < len(chunks):
        return [get_deterministic_embedding(chunk["content"]) for chunk in chunks]

    return embeddings
