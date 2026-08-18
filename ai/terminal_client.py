#!/usr/bin/env python3
"""Cliente de terminal para GeoNexus — se conecta al gateway WebSocket.

Uso:
  python terminal_client.py "tu consulta"
  python terminal_client.py --model gpt-4 --provider openai

Primero inicia el gateway:
  python sidecar.py --serve
"""

import argparse
import json
import os
import sys
import asyncio

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from logger import get_logger

logger = get_logger("terminal")

try:
    import websockets
except ImportError:
    logger.error("Requiere websockets: pip install websockets")
    sys.exit(1)


async def chat_loop(session_id: str, provider: str, endpoint: str, model: str, api_key: str | None):
    uri = os.getenv("GEONEXUS_GATEWAY_URL", "ws://127.0.0.1:9876/ws")
    messages: list[dict] = []

    print(f"Conectando a {uri} ...")
    async with websockets.connect(uri) as ws:
        print(f"Conectado. Session: {session_id}")
        print(f"Modelo: {model} ({provider})")
        print("Escribe tu mensaje o /exit para salir.\n")

        while True:
            try:
                user_input = input(">>> ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                break

            if not user_input:
                continue
            if user_input == "/exit":
                break
            if user_input == "/clear":
                messages.clear()
                print("Historial limpiado.\n")
                continue

            messages.append({"role": "user", "content": user_input})

            payload = {
                "action": "chat_llm_stream",
                "params": {
                    "provider_type": provider,
                    "base_url": endpoint,
                    "model": model,
                    "messages": messages,
                },
                "session_id": session_id,
            }
            if api_key:
                payload["params"]["api_key"] = api_key

            await ws.send(json.dumps(payload))

            full_content = ""
            while True:
                raw = await ws.recv()
                data = json.loads(raw)
                t = data.get("type")

                if t == "delta":
                    content = data.get("content", "")
                    full_content += content
                    print(content, end="", flush=True)

                elif t == "thinking":
                    content = data.get("content", "")
                    # Show reasoning in dimmed style
                    print(f"\033[2m{content}\033[0m", end="", flush=True)

                elif t == "done":
                    print()
                    print(f"\n[Completado — tokens: {data.get('usage', {}).get('total_tokens', '?')}]")
                    messages.append({"role": "assistant", "content": full_content})
                    break

                elif t == "error":
                    print(f"\n[Error: {data.get('message', 'desconocido')}]")
                    # Remove user message on error
                    messages.pop()
                    break

                elif t == "result":
                    print(json.dumps(data.get("data", {}), indent=2, ensure_ascii=False))
                    print()
                    break

            print()


async def main():
    p = argparse.ArgumentParser(description="GeoNexus Terminal Client")
    p.add_argument("prompt", nargs="?", default="", help="Mensaje inicial (opcional)")
    p.add_argument("--session-id", default="terminal-default")
    p.add_argument("--provider", default=os.getenv("GEONEXUS_PROVIDER", "openai"))
    p.add_argument("--endpoint", default=os.getenv("GEONEXUS_ENDPOINT", "http://localhost:11434/v1"))
    p.add_argument("--model", default=os.getenv("GEONEXUS_MODEL", "gpt-4o-mini"))
    p.add_argument("--api-key", default=os.getenv("GEONEXUS_API_KEY", ""))
    args = p.parse_args()

    api_key = args.api_key or None

    if args.prompt:
        # Single-turn mode: send prompt, print response, exit
        messages = [{"role": "user", "content": args.prompt}]
        uri = os.getenv("GEONEXUS_GATEWAY_URL", "ws://127.0.0.1:9876/ws")
        async with websockets.connect(uri) as ws:
            payload = {
                "action": "chat_llm_stream",
                "params": {
                    "provider_type": args.provider,
                    "base_url": args.endpoint,
                    "model": args.model,
                    "messages": messages,
                },
                "session_id": args.session_id,
            }
            if api_key:
                payload["params"]["api_key"] = api_key
            await ws.send(json.dumps(payload))
            while True:
                raw = await ws.recv()
                data = json.loads(raw)
                t = data.get("type")
                if t == "delta":
                    print(data.get("content", ""), end="", flush=True)
                elif t == "thinking":
                    print(f"\033[2m{data.get('content', '')}\033[0m", end="", flush=True)
                elif t == "done":
                    print()
                    break
                elif t == "error":
                    print(f"Error: {data.get('message', 'desconocido')}")
                    sys.exit(1)
    else:
        await chat_loop(args.session_id, args.provider, args.endpoint, args.model, api_key)


if __name__ == "__main__":
    asyncio.run(main())
