from typing import Dict

from docs.chunker import chunk_text
from docs.reader import extract_text
from graph.extractor import extract_graph_entities
from memory.chroma import upsert_chunks_to_vector_store
from memory.embeddings import generate_embeddings


def index_document_file(
    file_path: str,
    project_id: str,
    workspace_id: str,
    asset_id: str,
) -> Dict:
    """Ejecuta el pipeline documental completo y devuelve JSON compatible con Tauri."""
    text = extract_text(file_path)
    if text.startswith("[Error:"):
        return {"status": "error", "message": text}

    chunks = chunk_text(text)
    embeddings = generate_embeddings(chunks)

    ids = [f"{asset_id}_chunk_{chunk['chunk_index']}" for chunk in chunks]
    documents = [chunk["content"] for chunk in chunks]
    metadatas = [
        {
            "asset_id": asset_id,
            "project_id": project_id,
            "page": chunk["page_number"],
        }
        for chunk in chunks
    ]

    chroma_result = upsert_chunks_to_vector_store(
        collection_name=f"project_{project_id}_assets",
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )

    if chroma_result["status"] == "error":
        return chroma_result

    graph_result = extract_graph_entities(chunks, project_id, workspace_id)
    return {
        "status": "success",
        "chunks": chunks,
        "embeddings_count": len(embeddings),
        "graph_nodes": graph_result["nodes"],
        "graph_edges": graph_result["edges"],
    }
