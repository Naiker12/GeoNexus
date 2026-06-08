import argparse
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from docs.reader import extract_text
from llm.router import chat_llm_provider, list_llm_models, ping_llm_provider
from pipeline.indexer import index_document_file


def main() -> None:
    parser = argparse.ArgumentParser(description="GeoNexus AI Sidecar CLI")
    parser.add_argument(
        "--action",
        required=True,
        choices=["index", "extract", "ping_llm", "chat_llm", "list_llm_models"],
        help="Accion a realizar",
    )
    parser.add_argument("--file", default="", help="Ruta al archivo")
    parser.add_argument("--project_id", default="project-default", help="ID del proyecto")
    parser.add_argument("--workspace_id", default="workspace-default", help="ID del workspace")
    parser.add_argument("--asset_id", default="asset-default", help="ID del activo")
    parser.add_argument("--provider_type", default="", help="Tipo de proveedor LLM")
    parser.add_argument("--base_url", default="", help="Endpoint base del proveedor LLM")
    parser.add_argument("--model", default="", help="Modelo LLM")
    parser.add_argument("--prompt", default="", help="Prompt para chat_llm")

    args = parser.parse_args()

    if args.action == "ping_llm":
        if not args.provider_type or not args.base_url:
            _print_error("provider_type y base_url son requeridos")
        _print_json(ping_llm_provider(args.provider_type, args.base_url, args.model))
        return

    if args.action == "chat_llm":
        if not args.provider_type or not args.base_url or not args.model or not args.prompt:
            _print_error("provider_type, base_url, model y prompt son requeridos")
        _print_json(
            chat_llm_provider(
                args.provider_type,
                args.base_url,
                args.model,
                args.prompt,
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


def _print_json(payload: dict) -> None:
    print(json.dumps(payload))


def _print_error(message: str) -> None:
    _print_json({"status": "error", "message": message})
    raise SystemExit(1)


if __name__ == "__main__":
    main()
