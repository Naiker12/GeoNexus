#!/usr/bin/env python3
"""Geo Agents Sidecar CLI — dispatcher puro. Cada accion en su modulo."""

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
        chunk_index = meta.get("chunk_index", 0)
        chunks.append({"text": (res["results"].get("documents", [[]])[0] or [""])[i] if i < len(res["results"].get("documents", [[]])[0]) else "",
                        "source": meta.get("source", "desconocido"),
                        "asset_id": meta.get("asset_id", ""),
                        "chunk_index": chunk_index,
                        "chunk_id": doc_id,
                        "score": 1.0 - dist})
    _print(chunks)


def _build_context(args) -> None:
    from context.builder import build_project_context
    _print({"context": build_project_context(args.project_id, os.getenv("GEONEXUS_DB_PATH", ""))})


def _ping(args) -> None:
    from llm.router import ping_llm_provider
    _print(ping_llm_provider(args.provider_type, args.base_url, args.model))


def _load_json_arg(raw: str, file_path: str | None) -> list | dict | None:
    if file_path:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            _err(f"No se pudo leer {file_path}: {e}")
    if raw:
        return json.loads(raw)
    return None


def _chat(args) -> None:
    from llm.router import chat_llm_provider
    messages = _load_json_arg(args.messages, args.messages_file)
    if messages is None:
        messages = [{"role": "user", "content": args.prompt}]
    tools = _load_json_arg(args.tools, args.tools_file)
    _print(chat_llm_provider(args.provider_type, args.base_url, args.model, messages, tools, api_key=args.api_key or None))


def _chat_stream(args) -> None:
    from llm.router import chat_llm_provider_stream
    messages = _load_json_arg(args.messages, args.messages_file) or []
    tools = _load_json_arg(args.tools, args.tools_file)
    saw_done = False
    try:
        for chunk in chat_llm_provider_stream(args.provider_type, args.base_url, args.model, messages, tools, api_key=args.api_key or None):
            if isinstance(chunk, dict) and chunk.get("type") == "done":
                saw_done = True
            _print(chunk)
    except Exception as e:
        # Emit a structured error so callers always get a final message
        _print({"type": "error", "message": f"Error while streaming: {e}"})
        return

    if not saw_done:
        # The provider stream ended without an explicit 'done' event — emit a final sentinel
        _print({
            "type": "done",
            "status": "error",
            "message": "stream ended without final 'done' from provider",
        })


def _list_models(args) -> None:
    from llm.router import list_llm_models
    _print(list_llm_models(args.provider_type, args.base_url))


def _search_web(args) -> None:
    if getattr(args, 'search_depth', 'standard') == 'deep':
        from web_search import search_web_deep
        results = search_web_deep(args.query, provider=args.search_provider, api_key=args.api_key or None, cse_id=args.cse_id or None, max_results=args.max_results)
    else:
        from web_search import search_web
        results = search_web(args.query, provider=args.search_provider, api_key=args.api_key or None, cse_id=args.cse_id or None, max_results=args.max_results)
    import sys
    print(f"[DEBUG] search_web returned {len(results)} results (depth={getattr(args, 'search_depth', 'standard')})", file=sys.stderr)
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
    chunks = _load_json_arg(args.chunks_json, args.chunks_file) or []
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


def _update_memory_scores(args) -> None:
    import sqlite3
    from datetime import datetime
    from graph.memory import compute_memory_score

    db_path = os.getenv("GEONEXUS_DB_PATH", "")
    if not db_path:
        _err("GEONEXUS_DB_PATH no esta definido")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    now = datetime.utcnow()
    threshold = max(0.1, min(args.threshold or 0.3, 10.0))

    rows = conn.execute("""
        SELECT * FROM graph_nodes
        WHERE deleted_at IS NULL
    """).fetchall()

    updated = 0
    for row in rows:
        node = dict(row)
        score = compute_memory_score(node, now=now)
        should_show = score >= threshold or node.get("pinned")

        conn.execute(
            "UPDATE graph_nodes SET memory_score = ? WHERE id = ?",
            (score, node["id"]),
        )
        updated += 1

    conn.commit()
    conn.close()
    _print({
        "status": "success",
        "updated": updated,
        "threshold": threshold,
    })


# Singleton de Kokoro (lazy init, se reusa entre llamadas)
_kokoro_instance = None

def _get_kokoro():
    global _kokoro_instance
    if _kokoro_instance is None:
        try:
            from kokoro import Kokoro
            _kokoro_instance = Kokoro()
        except Exception as e:
            _kokoro_instance = f"error:{e}"
    return _kokoro_instance


def _audio_transcribe(args) -> None:
    """Transcribe audio a texto usando faster-whisper (local, sin API key)."""
    import base64
    import tempfile
    import os

    audio_base64 = args.audio_base64
    mime_type = args.mime_type or "audio/webm"

    try:
        audio_bytes = base64.b64decode(audio_base64)
    except Exception as e:
        _err(f"Error decodificando audio: {e}")

    suffix = ".webm" if "webm" in mime_type else ".mp4" if "mp4" in mime_type else ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("base", device="cpu", compute_type="int8")
        segments, info = model.transcribe(tmp_path, language="es")
        text = " ".join(seg.text for seg in segments)
        _print({
            "status": "ok",
            "text": text,
            "language": info.language if info else "es",
        })
    except Exception as e:
        _err(f"Error en transcripcion: {e}")
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass


def _audio_synthesize(args) -> None:
    """Sintetiza texto a audio usando Kokoro (local) o gTTS (fallback). Sin API key."""
    import base64
    import io
    import re

    text = args.text
    if not text:
        _err("Texto vacio para sintesis")

    # Limpiar puntuacion: el TTS no debe leer comas, puntos, etc.
    clean = re.sub(r'[.,;:!?¿¡—–()\[\]{}<>"/\\\'’‘“”`]', ' ', text)
    clean = re.sub(r'\s+', ' ', clean).strip()
    if not clean:
        clean = text

    voice = args.voice or "am_michael"
    provider = args.provider or "kokoro"
    speed = float(args.speed) if args.speed else 1.2

    # --- Kokoro TTS (local, sin internet, sin API key) ---
    if provider == "kokoro":
        kokoro = _get_kokoro()
        if isinstance(kokoro, str) and kokoro.startswith("error:"):
            import sys
            print(f"[Kokoro] No disponible ({kokoro}), fallback a gTTS", file=sys.stderr)
            provider = "gtts"
        else:
            try:
                import numpy as np
                import soundfile as sf

                audio_array = kokoro.create(clean, voice=voice, speed=speed)
                sample_rate = 24000

                buffer = io.BytesIO()
                sf.write(buffer, audio_array, sample_rate, format='WAV')
                buffer.seek(0)
                audio_bytes = buffer.read()

                audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
                _print({
                    "status": "ok",
                    "audio_base64": audio_b64,
                    "mime_type": "audio/wav",
                    "provider": "kokoro",
                })
                return
            except Exception as e:
                import sys
                print(f"[Kokoro] Fallo en create(): {e}, fallback a gTTS", file=sys.stderr)
                provider = "gtts"

    # --- gTTS Fallback (Google, sin API key, requiere internet) ---
    if provider == "gtts":
        try:
            from gtts import gTTS
            lang = args.lang or "es"

            buffer = io.BytesIO()
            tts = gTTS(text=clean, lang=lang, slow=False)
            tts.write_to_fp(buffer)
            buffer.seek(0)
            audio_bytes = buffer.read()

            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            _print({
                "status": "ok",
                "audio_base64": audio_b64,
                "mime_type": "audio/mpeg",
                "provider": "gtts",
            })
            return
        except Exception as e:
            _err(f"gTTS fallo: {e}")

    _err("No hay proveedor TTS disponible")


def main() -> None:
    p = argparse.ArgumentParser(description="Geo Agents AI Sidecar CLI")
    p.add_argument("--action", required=True, choices=["index", "extract", "ping_llm", "chat_llm", "chat_llm_stream", "list_llm_models", "recall_chunks", "build_project_context", "search_web", "extract_chat_entities", "extract_graph_entities", "extract_shapefile", "extract_keywords", "update_memory_scores", "audio_transcribe", "audio_synthesize"])
    p.add_argument("--file", default="")
    p.add_argument("--project_id", default="project-default")
    p.add_argument("--workspace_id", default="workspace-default")
    p.add_argument("--asset_id", default="asset-default")
    p.add_argument("--provider_type", default="")
    p.add_argument("--base_url", default="")
    p.add_argument("--model", default="")
    p.add_argument("--prompt", default="")
    p.add_argument("--messages", default="")
    p.add_argument("--messages_file", default="")
    p.add_argument("--tools", default="")
    p.add_argument("--tools_file", default="")
    p.add_argument("--api_key", default="")
    p.add_argument("--chunks_json", default="")
    p.add_argument("--chunks_file", default="")
    p.add_argument("--query", default="")
    p.add_argument("--top_k", type=int, default=4)
    p.add_argument("--collection", default="project_memory")
    p.add_argument("--search_provider", default="duckduckgo")
    p.add_argument("--cse_id", default="")
    p.add_argument("--max_results", type=int, default=10)
    p.add_argument("--search_depth", default="standard", choices=["standard", "deep"])
    p.add_argument("--threshold", type=float, default=0.3)
    # Parametros para audio
    p.add_argument("--audio_base64", default="")
    p.add_argument("--mime_type", default="")
    p.add_argument("--text", default="")
    p.add_argument("--voice", default="")
    p.add_argument("--speed", default="")
    p.add_argument("--provider", default="kokoro")
    p.add_argument("--lang", default="es")
    args = p.parse_args()

    dispatch = {
        "recall_chunks": _recall,
        "build_project_context": _build_context,
        "ping_llm": _ping,
        "chat_llm": _chat,
        "chat_llm_stream": _chat_stream,
        "list_llm_models": _list_models,
        "search_web": _search_web,
        "extract": _extract,
        "extract_chat_entities": _extract_chat_entities,
        "extract_graph_entities": _extract_graph_entities,
        "index": _index,
        "extract_shapefile": _extract_shapefile,
        "extract_keywords": _extract_keywords,
        "update_memory_scores": _update_memory_scores,
        "audio_transcribe": _audio_transcribe,
        "audio_synthesize": _audio_synthesize,
    }

    handler = dispatch.get(args.action)
    if handler:
        handler(args)


if __name__ == "__main__":
    main()
