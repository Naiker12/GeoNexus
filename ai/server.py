"""GeoNexus AI Gateway — WebSocket persistente.

Reemplaza el patrón "subprocess por acción" con un servidor FastAPI
que mantiene estado entre llamadas (sesiones, shell persistente, etc.).

Protocolo:
  Cliente → {action, params, session_id}
  Servidor → {type: "delta"|"done"|"error"|"thinking", ...}

Uso:
  python server.py [--port 9876] [--host 127.0.0.1]
"""

import argparse
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from logger import get_logger

logger = get_logger("gateway")

try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
    import uvicorn
except ImportError:
    logger.error("fastapi/uvicorn no instalados. Corre: pip install fastapi uvicorn")
    sys.exit(1)

app = FastAPI(title="GeoNexus AI Gateway")

# ── Estado vivo entre llamadas ──────────────────────────────────────
SESSIONS: dict[str, dict] = {}


def get_session(session_id: str) -> dict:
    if session_id not in SESSIONS:
        SESSIONS[session_id] = {
            "shell": None,
        }
    return SESSIONS[session_id]


# ── Handlers no-streaming ────────────────────────────────────────────

async def handle_recall_chunks(params: dict, ws: WebSocket) -> None:
    from memory.chroma import query_chunks
    from memory.embeddings import get_deterministic_embedding
    emb = get_deterministic_embedding(params.get("query", ""))
    res = query_chunks(
        collection_name=params.get("collection", "project_memory"),
        query_embeddings=[emb],
        n_results=params.get("top_k", 4),
        where={"project_id": params.get("project_id", "project-default")},
    )
    if res["status"] != "success":
        await ws.send_json({"type": "result", "data": []})
        return
    chunks = []
    for i, doc_id in enumerate(res["results"].get("ids", [[]])[0]):
        meta = (res["results"].get("metadatas", [[]])[0] or [{}])[i] if i < len(res["results"].get("metadatas", [[]])[0]) else {}
        dist = (res["results"].get("distances", [[]])[0] or [0.0])[i] if i < len(res["results"].get("distances", [[]])[0]) else 0.0
        chunks.append({
            "text": (res["results"].get("documents", [[]])[0] or [""])[i] if i < len(res["results"].get("documents", [[]])[0]) else "",
            "source": meta.get("source", "desconocido"),
            "asset_id": meta.get("asset_id", ""),
            "chunk_index": meta.get("chunk_index", 0),
            "chunk_id": doc_id,
            "score": 1.0 - dist,
        })
    await ws.send_json({"type": "result", "data": chunks})


async def handle_build_context(params: dict, ws: WebSocket) -> None:
    from context.builder import build_project_context
    ctx = build_project_context(
        params.get("project_id", "project-default"),
        os.getenv("GEONEXUS_DB_PATH", ""),
    )
    await ws.send_json({"type": "result", "data": {"context": ctx}})


async def handle_ping(params: dict, ws: WebSocket) -> None:
    from llm.router import ping_llm_provider
    result = ping_llm_provider(
        params.get("provider_type", ""),
        params.get("base_url", ""),
        params.get("model", ""),
    )
    await ws.send_json({"type": "result", "data": result})


async def handle_list_models(params: dict, ws: WebSocket) -> None:
    from llm.router import list_llm_models
    result = list_llm_models(
        params.get("provider_type", ""),
        params.get("base_url", ""),
    )
    await ws.send_json({"type": "result", "data": result})


async def handle_search_web(params: dict, ws: WebSocket) -> None:
    depth = params.get("search_depth", "standard")
    if depth == "deep":
        from tools.web_search import search_web_deep
        results = search_web_deep(
            params.get("query", ""),
            provider=params.get("search_provider", "duckduckgo"),
            api_key=params.get("api_key") or None,
            cse_id=params.get("cse_id") or None,
            max_results=params.get("max_results", 10),
        )
    else:
        from tools.web_search import search_web
        results = search_web(
            params.get("query", ""),
            provider=params.get("search_provider", "duckduckgo"),
            api_key=params.get("api_key") or None,
            cse_id=params.get("cse_id") or None,
            max_results=params.get("max_results", 10),
        )
    await ws.send_json({"type": "result", "data": results})


async def handle_extract(params: dict, ws: WebSocket) -> None:
    from docs.reader import extract_text
    text = extract_text(params.get("file", ""))
    await ws.send_json({"type": "result", "data": {"text": text}})


async def handle_extract_chat_entities(params: dict, ws: WebSocket) -> None:
    from graph.chat_extractor import extract_chat_entities
    result = extract_chat_entities(
        text=params.get("query", ""),
        project_id=params.get("project_id", "project-default"),
        workspace_id=params.get("workspace_id", "workspace-default"),
    )
    await ws.send_json({"type": "result", "data": result})


async def handle_extract_graph_entities(params: dict, ws: WebSocket) -> None:
    from graph.extractor import extract_graph_entities
    chunks = params.get("chunks", [])
    result = extract_graph_entities(
        chunks,
        params.get("project_id", "project-default"),
        params.get("workspace_id", "workspace-default"),
    )
    await ws.send_json({"type": "result", "data": result})


async def handle_index(params: dict, ws: WebSocket) -> None:
    from pipeline.indexer import index_document_file
    result = index_document_file(
        file_path=params.get("file", ""),
        project_id=params.get("project_id", "project-default"),
        workspace_id=params.get("workspace_id", "workspace-default"),
        asset_id=params.get("asset_id", "asset-default"),
    )
    await ws.send_json({"type": "result", "data": result})


async def handle_extract_shapefile(params: dict, ws: WebSocket) -> None:
    from tools.gis_tools import shapefile_to_text_chunks
    result = shapefile_to_text_chunks(params.get("file", ""))
    await ws.send_json({"type": "result", "data": result})


async def handle_extract_keywords(params: dict, ws: WebSocket) -> None:
    from recall.keyword_extractor import extract_keywords
    result = extract_keywords(
        params.get("query", ""),
        max_keywords=params.get("top_k", 4),
    )
    await ws.send_json({"type": "result", "data": result})


async def handle_audio_transcribe(params: dict, ws: WebSocket) -> None:
    from tools.audio_tools import transcribe_audio
    result = transcribe_audio(
        params.get("audio_base64", ""),
        params.get("mime_type", "audio/webm"),
    )
    if result.get("status") == "error":
        await ws.send_json({"type": "error", "message": result.get("message", "Error")})
    else:
        await ws.send_json({"type": "result", "data": result})


async def handle_audio_synthesize(params: dict, ws: WebSocket) -> None:
    from tools.audio_tools import synthesize_speech
    result = synthesize_speech(
        params.get("text", ""),
        params.get("voice", "alloy"),
        float(params.get("speed", 1.0)),
    )
    if result.get("status") == "error":
        await ws.send_json({"type": "error", "message": result.get("message", "Error")})
    else:
        await ws.send_json({"type": "result", "data": result})


DANGEROUS_COMMANDS = [
    "rm -rf /", "rm -rf /*", "mkfs", "dd if=", "format",
    ":(){ :|:& };:", "chmod -R 777 /", "sudo rm", "> /dev/sda",
    "shutdown", "reboot", "init 0", "init 6", "poweroff",
    "halt", "grub-install", "dd if=/dev/zero",
    "mv / /dev/null", "wget -O- http", "curl ",
]

def command_is_safe(command: str) -> tuple[bool, str]:
    """Check a shell command against a blocklist of dangerous patterns."""
    stripped = command.strip().lower()
    if not stripped:
        return False, "Comando vacío"
    for pattern in DANGEROUS_COMMANDS:
        if stripped.startswith(pattern.lower()) or pattern.lower() in stripped:
            return False, f"Comando bloqueado por seguridad: coincide con patrón '{pattern}'"
    return True, ""

async def handle_execute_shell(params: dict, ws: WebSocket, session_id: str) -> None:
    from agent.workspace import PersistentShell
    session = get_session(session_id)
    if session["shell"] is None:
        session["shell"] = PersistentShell(
            params.get("working_dir", "."),
            params.get("env_passthrough", "").split(",") if params.get("env_passthrough") else [],
        )

    command = params.get("shell_command", "")
    safe, reason = command_is_safe(command)
    if not safe:
        await ws.send_json({
            "type": "result",
            "data": {"output": reason, "exit_code": 1, "cwd": params.get("working_dir", session["shell"].cwd)},
        })
        return

    result = session["shell"].run(command)
    await ws.send_json({"type": "result", "data": result})


# ── Handlers streaming ──────────────────────────────────────────────

async def handle_chat_stream(params: dict, ws: WebSocket) -> None:
    """Reenvía el streaming del LLM token por token sobre WebSocket."""
    from llm.router import chat_llm_provider_stream
    messages = params.get("messages", [])
    tools = params.get("tools")
    reasoning_effort = params.get("reasoning_effort") or None

    for chunk in chat_llm_provider_stream(
        params.get("provider_type", ""),
        params.get("base_url", ""),
        params.get("model", ""),
        messages,
        tools=tools,
        api_key=params.get("api_key") or None,
        reasoning_effort=reasoning_effort,
    ):
        await ws.send_json(chunk)
        if chunk.get("type") == "done" or chunk.get("type") == "error":
            break


async def handle_chat_llm(params: dict, ws: WebSocket) -> None:
    """Non-streaming LLM call — returns result dict directly (same schema as sidecar.py --action chat_llm)."""
    from llm.router import chat_llm_provider
    messages = params.get("messages", [])
    tools = params.get("tools")
    api_key = params.get("api_key") or None

    result = chat_llm_provider(
        params.get("provider_type", ""),
        params.get("base_url", ""),
        params.get("model", ""),
        messages,
        tools=tools,
        api_key=api_key,
    )
    await ws.send_json(result)  # raw result dict, no wrapping


# ── Router principal ─────────────────────────────────────────────────

HANDLERS = {
    "recall_chunks": handle_recall_chunks,
    "build_project_context": handle_build_context,
    "ping_llm": handle_ping,
    "list_llm_models": handle_list_models,
    "chat_llm_stream": handle_chat_stream,
    "chat_llm": handle_chat_llm,
    "search_web": handle_search_web,
    "extract": handle_extract,
    "extract_chat_entities": handle_extract_chat_entities,
    "extract_graph_entities": handle_extract_graph_entities,
    "index": handle_index,
    "extract_shapefile": handle_extract_shapefile,
    "extract_keywords": handle_extract_keywords,
    "audio_transcribe": handle_audio_transcribe,
    "audio_synthesize": handle_audio_synthesize,
    "execute_shell_command": handle_execute_shell,
}


@app.websocket("/ws")
async def gateway(ws: WebSocket) -> None:
    await ws.accept()
    session_id = "default"
    logger.info("Cliente conectado al gateway")

    try:
        while True:
            raw = await ws.receive_json()
            action = raw.get("action", "")
            params = raw.get("params", {})
            session_id = raw.get("session_id", session_id)

            handler = HANDLERS.get(action)
            if handler is None:
                await ws.send_json({
                    "type": "error",
                    "message": f"Acción desconocida: {action}",
                })
                continue

            try:
                if action == "execute_shell_command":
                    await handler(params, ws, session_id)
                elif action == "chat_llm_stream":
                    await handler(params, ws)
                else:
                    await handler(params, ws)
            except Exception as e:
                logger.error("Error en handler %s: %s", action, e)
                await ws.send_json({"type": "error", "message": str(e)})

    except WebSocketDisconnect:
        logger.info("Cliente desconectado (session=%s)", session_id)
    except Exception as e:
        logger.error("Error en gateway: %s", e)


# ── Punto de entrada ─────────────────────────────────────────────────

def main() -> None:
    p = argparse.ArgumentParser(description="GeoNexus AI Gateway Server")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=9876)
    args = p.parse_args()

    logger.info("Gateway escuchando en ws://%s:%d/ws", args.host, args.port)
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
