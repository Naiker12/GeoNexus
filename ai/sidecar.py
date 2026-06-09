import argparse
import json
import os
import sys
from typing import Any, Dict, List, Optional

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from docs.reader import extract_text
from llm.router import chat_llm_provider, list_llm_models, ping_llm_provider
from pipeline.indexer import index_document_file


def main() -> None:
    parser = argparse.ArgumentParser(description="GeoNexus AI Sidecar CLI")
    parser.add_argument(
        "--action",
        required=True,
        choices=[
            "index", "extract", "ping_llm", "chat_llm", "list_llm_models",
            "recall_chunks", "build_project_context",
        ],
        help="Accion a realizar",
    )
    parser.add_argument("--file", default="", help="Ruta al archivo")
    parser.add_argument("--project_id", default="project-default", help="ID del proyecto")
    parser.add_argument("--workspace_id", default="workspace-default", help="ID del workspace")
    parser.add_argument("--asset_id", default="asset-default", help="ID del activo")
    parser.add_argument("--provider_type", default="", help="Tipo de proveedor LLM")
    parser.add_argument("--base_url", default="", help="Endpoint base del proveedor LLM")
    parser.add_argument("--model", default="", help="Modelo LLM")
    parser.add_argument("--prompt", default="", help="Prompt plano para chat_llm (legacy)")
    parser.add_argument("--messages", default="", help="JSON con array de mensajes para chat_llm")
    parser.add_argument("--tools", default="", help="JSON con array de tool definitions (opcional)")
    parser.add_argument("--query", default="", help="Query para recall")
    parser.add_argument("--top_k", type=int, default=4, help="Top K chunks para recall")
    parser.add_argument("--collection", default="project_memory", help="Coleccion ChromaDB")

    args = parser.parse_args()

    if args.action == "recall_chunks":
        if not args.query or not args.project_id:
            _print_error("query y project_id son requeridos")
        # Los embeddings los genera el sidecar con EmbeddingModel
        from memory.chroma import query_chunks
        from memory.embeddings import get_deterministic_embedding

        query_embedding = get_deterministic_embedding(args.query)
        result = query_chunks(
            collection_name=args.collection,
            query_embeddings=[query_embedding],
            n_results=args.top_k,
            where={"project_id": args.project_id},
        )

        if result["status"] != "success":
            _print_json([])
            return

        results = result["results"]
        chunks = []
        ids = results.get("ids", [[]])[0]
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for i, doc_id in enumerate(ids):
            meta = metadatas[i] if i < len(metadatas) else {}
            chunks.append({
                "text": documents[i] if i < len(documents) else "",
                "source": meta.get("source", "desconocido"),
                "asset_id": meta.get("asset_id", ""),
                "score": 1.0 - distances[i] if i < len(distances) else 0.0,
            })

        _print_json(chunks)
        return

    if args.action == "build_project_context":
        if not args.project_id:
            _print_error("project_id requerido")
        from context.builder import build_project_context
        db_path = os.getenv("GEONEXUS_DB_PATH", "")
        context = build_project_context(args.project_id, db_path)
        _print_json({"context": context})
        return

    if args.action == "ping_llm":
        if not args.provider_type or not args.base_url:
            _print_error("provider_type y base_url son requeridos")
        _print_json(ping_llm_provider(args.provider_type, args.base_url, args.model))
        return

    if args.action == "chat_llm":
        if not args.provider_type or not args.base_url or not args.model:
            _print_error("provider_type, base_url y model son requeridos")
        if not args.messages and not args.prompt:
            _print_error("messages o prompt es requerido")

        messages: List[Dict[str, Any]]
        if args.messages:
            messages = json.loads(args.messages)
        else:
            messages = [{"role": "user", "content": args.prompt}]

        tools: Optional[List[Dict[str, Any]]] = None
        if args.tools:
            tools = json.loads(args.tools)

        _print_json(
            chat_llm_provider(
                args.provider_type,
                args.base_url,
                args.model,
                messages,
                tools,
            )
        )
        return

    if args.action == "list_llm_models":
        if not args.provider_type or not args.base_url:
            _print_error("provider_type y base_url son requeridos")
        _print_json(list_llm_models(args.provider_type, args.base_url))
        return

    if not args.file:
        _print_error("file requerido")

    if args.action == "extract":
        _print_json({"text": extract_text(args.file)})
        return

    if args.action == "index":
        _print_json(
            index_document_file(
                file_path=args.file,
                project_id=args.project_id,
                workspace_id=args.workspace_id,
                asset_id=args.asset_id,
            )
        )


def _print_json(payload: dict | list) -> None:
    print(json.dumps(payload))


def _print_error(message: str) -> None:
    _print_json({"status": "error", "message": message})
    raise SystemExit(1)


if __name__ == "__main__":
    main()
