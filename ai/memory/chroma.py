import os
import json

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
        except:
            db = {}

        for i, idx in enumerate(ids):
            db[idx] = {
                "embedding": embeddings[i],
                "document": documents[i],
                "metadata": metadatas[i]
            }

        with open(self.storage_file, "w") as f:
            json.dump(db, f, indent=2)
        return True

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
    db_path: str = "./chroma_db"
) -> dict:
    """Upserta vectores de chunks en la colección de ChromaDB."""
    init_res = init_chroma(db_path)
    client = init_res["client"]
    
    try:
        collection = client.get_or_create_collection(name=collection_name)
        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
        return {
            "status": "success",
            "count": len(ids),
            "collection": collection_name,
            "store_type": init_res["type"]
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
