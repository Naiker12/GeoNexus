#!/usr/bin/env python3
"""GeoNexus Sidecar CLI — dispatcher puro. Cada accion en su modulo."""

import argparse
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def _print(payload: dict | list) -> None:
    text = json.dumps(payload, ensure_ascii=False)
    try:
        sys.stdout.buffer.write((text + "\n").encode("utf-8"))
        sys.stdout.buffer.flush()
    except (UnicodeEncodeError, AttributeError):
        print(text)


def _err(msg: str) -> None:
    _print({"status": "error", "message": msg})
    raise SystemExit(1)


def _recall(args) -> None:
    from memory.chroma import query_chunks
    from memory.embeddings import get_deterministic_embedding
    emb = get_deterministic_embedding(args.query)
    res = query_chunks(collection_name=args.collection, query_embeddings=[emb],
                       n_results=args.top_k, where={"project_id": args.project_id})
    if res["status"] != "success":
        return _print([])
    chunks = []
    for i, doc_id in enumerate(res["results"].get("ids", [[]])[0]):
        meta = (res["results"].get("metadatas", [[]])[0] or [{}])[i] if i < len(res["results"].get("metadatas", [[]])[0]) else {}
        dist = (res["results"].get("distances", [[]])[0] or [0.0])[i] if i < len(res["results"].get("distances", [[]])[0]) else 0.0
        chunks.append({"text": (res["results"].get("documents", [[]])[0] or [""])[i] if i < len(res["results"].get("documents", [[]])[0]) else "",
                        "source": meta.get("source", "desconocido"),
                        "asset_id": meta.get("asset_id", ""),
                        "score": 1.0 - dist})
    _print(chunks)


def _build_context(args) -> None:
    from context.builder import build_project_context
    _print({"context": build_project_context(args.project_id, os.getenv("GEONEXUS_DB_PATH", ""))})


def _ping(args) -> None:
    from llm.router import ping_llm_provider
    _print(ping_llm_provider(args.provider_type, args.base_url, args.model))


def _chat(args) -> None:
    from llm.router import chat_llm_provider
    messages = json.loads(args.messages) if args.messages else [{"role": "user", "content": args.prompt}]
    tools = json.loads(args.tools) if args.tools else None
    _print(chat_llm_provider(args.provider_type, args.base_url, args.model, messages, tools, api_key=args.api_key or None))


def _list_models(args) -> None:
    from llm.router import list_llm_models
    _print(list_llm_models(args.provider_type, args.base_url))


def _search_web(args) -> None:
    from web_search import search_web
    results = search_web(args.query, provider=args.search_provider, api_key=args.api_key or None, cse_id=args.cse_id or None, max_results=args.max_results)
    import sys
    print(f"[DEBUG] search_web returned {len(results)} results", file=sys.stderr)
    _print(results)


def _extract(args) -> None:
    from docs.reader import extract_text
    _print({"text": extract_text(args.file)})


def _extract_chat_entities(args) -> None:
    from graph.chat_extractor import extract_chat_entities
    _print(extract_chat_entities(
        text=args.query,
        project_id=args.project_id,
        workspace_id=args.workspace_id,
    ))


def _extract_graph_entities(args) -> None:
    from graph.extractor import extract_graph_entities
    chunks = json.loads(args.chunks_json) if args.chunks_json else []
    _print(extract_graph_entities(chunks, args.project_id, args.workspace_id))


def _index(args) -> None:
    from pipeline.indexer import index_document_file
    _print(index_document_file(file_path=args.file, project_id=args.project_id, workspace_id=args.workspace_id, asset_id=args.asset_id))


def _extract_shapefile(args) -> None:
    from extractors.shapefile_extractor import shapefile_to_text_chunks
    _print(shapefile_to_text_chunks(args.file))


def _extract_keywords(args) -> None:
    from recall.keyword_extractor import extract_keywords
    _print(extract_keywords(args.query, max_keywords=args.top_k))


def main() -> None:
    p = argparse.ArgumentParser(description="GeoNexus AI Sidecar CLI")
    p.add_argument("--action", required=True, choices=["index", "extract", "ping_llm", "chat_llm", "list_llm_models", "recall_chunks", "build_project_context", "search_web", "extract_chat_entities", "extract_graph_entities", "extract_shapefile", "extract_keywords"])
    p.add_argument("--file", default="")
    p.add_argument("--project_id", default="project-default")
    p.add_argument("--workspace_id", default="workspace-default")
    p.add_argument("--asset_id", default="asset-default")
    p.add_argument("--provider_type", default="")
    p.add_argument("--base_url", default="")
    p.add_argument("--model", default="")
    p.add_argument("--prompt", default="")
    p.add_argument("--messages", default="")
    p.add_argument("--tools", default="")
    p.add_argument("--api_key", default="")
    p.add_argument("--chunks_json", default="")
    p.add_argument("--query", default="")
    p.add_argument("--top_k", type=int, default=4)
    p.add_argument("--collection", default="project_memory")
    p.add_argument("--search_provider", default="duckduckgo")
    p.add_argument("--cse_id", default="")
    p.add_argument("--max_results", type=int, default=5)
    args = p.parse_args()

    dispatch = {
        "recall_chunks": _recall,
        "build_project_context": _build_context,
        "ping_llm": _ping,
        "chat_llm": _chat,
        "list_llm_models": _list_models,
        "search_web": _search_web,
        "extract": _extract,
        "extract_chat_entities": _extract_chat_entities,
        "extract_graph_entities": _extract_graph_entities,
        "index": _index,
        "extract_shapefile": _extract_shapefile,
        "extract_keywords": _extract_keywords,
    }

    handler = dispatch.get(args.action)
    if handler:
        handler(args)


if __name__ == "__main__":
    main()
