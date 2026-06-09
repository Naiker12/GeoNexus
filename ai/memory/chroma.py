import math
import os
import json


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Coseno entre dos vectores."""
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


class MockChromaCollection:
    def __init__(self, name: str, path: str):
        self.name = name
        self.path = path
        self.storage_file = os.path.join(path, f"mock_collection_{name}.json")
        os.makedirs(path, exist_ok=True)
        if not os.path.exists(self.storage_file):
            with open(self.storage_file, "w") as f:
                json.dump({}, f)

    def upsert(self, ids, embeddings, documents, metadatas):
        try:
            with open(self.storage_file, "r") as f:
                db = json.load(f)
        except Exception:
            db = {}

        for i, idx in enumerate(ids):
            db[idx] = {
                "embedding": embeddings[i],
                "document": documents[i],
                "metadata": metadatas[i],
            }

        with open(self.storage_file, "w") as f:
            json.dump(db, f, indent=2)
        return True

    def query(self, query_embeddings, n_results=4, where=None):
        """Busca los n_results vectores más cercanos con filtro opcional."""
        try:
            with open(self.storage_file, "r") as f:
                db = json.load(f)
        except Exception:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

        query_emb = query_embeddings[0] if query_embeddings else []

        scored = []
        for idx, data in db.items():
            meta = data.get("metadata", {}) or {}

            # Filtrar por `where` si se especifica
            if where:
                skip = False
                for key, val in where.items():
                    if meta.get(key) != val:
                        skip = True
                        break
                if skip:
                    continue

            sim = _cosine_similarity(query_emb, data.get("embedding", []))
            scored.append((sim, idx, data["document"], meta))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:n_results]

        ids = [t[1] for t in top]
        documents = [t[2] for t in top]
        metadatas = [t[3] for t in top]
        distances = [1.0 - t[0] for t in top]  # convertir similitud a distancia

        return {
            "ids": [ids],
            "documents": [documents],
            "metadatas": [metadatas],
            "distances": [distances],
        }


class MockChromaClient:
    def __init__(self, path: str):
        self.path = path

    def get_or_create_collection(self, name: str):
        return MockChromaCollection(name, self.path)


def init_chroma(path: str = "./chroma_db"):
    """Inicializa el cliente de ChromaDB. Cae en mock si no está disponible."""
    try:
        import chromadb

        client = chromadb.PersistentClient(path=path)
        return {"status": "initialized", "client": client, "type": "real"}
    except ImportError:
        client = MockChromaClient(path=path)
        return {"status": "initialized_mock", "client": client, "type": "mock"}


def upsert_chunks_to_vector_store(
    collection_name: str,
    ids: list,
    embeddings: list,
    documents: list,
    metadatas: list,
    db_path: str = "./chroma_db",
) -> dict:
    """Upserta vectores de chunks en la colección de ChromaDB."""
    init_res = init_chroma(db_path)
    client = init_res["client"]

    try:
        collection = client.get_or_create_collection(name=collection_name)
        collection.upsert(
            ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas
        )
        return {
            "status": "success",
            "count": len(ids),
            "collection": collection_name,
            "store_type": init_res["type"],
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


def query_chunks(
    collection_name: str,
    query_embeddings: list[list[float]],
    n_results: int = 4,
    where: dict | None = None,
    db_path: str = "./chroma_db",
) -> dict:
    """Consulta chunks similares en ChromaDB."""
    init_res = init_chroma(db_path)
    client = init_res["client"]

    try:
        collection = client.get_or_create_collection(name=collection_name)
        results = collection.query(
            query_embeddings=query_embeddings,
            n_results=n_results,
            where=where,
        )
        return {
            "status": "success",
            "results": results,
            "store_type": init_res["type"],
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
