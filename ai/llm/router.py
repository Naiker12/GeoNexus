import json
import os
import time
from typing import Any, Dict, List, Optional


OPENAI_COMPATIBLE_PROVIDERS = {
    "lmstudio",
    "openai",
    "openrouter",
    "custom",
    "custom-api",
}


def ping_llm_provider(provider_type: str, base_url: str, model: str = "") -> Dict:
    """Verifica conectividad basica contra un proveedor LLM configurado."""
    import requests

    started = time.perf_counter()
    provider = provider_type.lower().strip()
    url = base_url.rstrip("/")

    try:
        if provider == "ollama":
            response = requests.get(f"{url}/api/tags", timeout=3)
        elif provider == "openrouter":
            api_key = os.getenv("OPENROUTER_API_KEY")
            if not api_key:
                return {
                    "status": "needs-key",
                    "provider_type": provider,
                    "message": "OPENROUTER_API_KEY no esta configurado.",
                }
            headers = {
                "authorization": f"Bearer {api_key}",
                "http-referer": "https://geonexus.local",
                "x-title": "Geo Agents",
            }
            response = requests.post(
                f"{url}/chat/completions",
                headers=headers,
                json={
                    "model": model or "openrouter/auto",
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 1,
                },
                timeout=8,
            )
        elif provider in OPENAI_COMPATIBLE_PROVIDERS:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key and provider != "lmstudio":
                return {
                    "status": "needs-key",
                    "provider_type": provider,
                    "message": f"{provider.upper()}_API_KEY no esta configurado.",
                }
            headers = {}
            if api_key:
                headers["authorization"] = f"Bearer {api_key}"
            response = requests.get(f"{url}/models", headers=headers, timeout=5)
        elif provider == "anthropic":
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                return {
                    "status": "needs-key",
                    "provider_type": provider,
                    "message": "ANTHROPIC_API_KEY no esta configurado.",
                }
            response = requests.post(
                f"{url}/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": 1,
                    "messages": [{"role": "user", "content": "ping"}],
                },
                timeout=8,
            )
        else:
            return {
                "status": "error",
                "provider_type": provider,
                "message": f"Proveedor no soportado: {provider_type}",
            }

        latency_ms = round((time.perf_counter() - started) * 1000)
        if 200 <= response.status_code < 300:
            return {
                "status": "ok",
                "provider_type": provider,
                "model": model,
                "latency_ms": latency_ms,
            }

        return {
            "status": "error",
            "provider_type": provider,
            "model": model,
            "latency_ms": latency_ms,
            "message": f"HTTP {response.status_code}: {response.text[:240]}",
        }
    except Exception as exc:
        return {
            "status": "error",
            "provider_type": provider,
            "model": model,
            "message": str(exc),
        }


def list_llm_models(provider_type: str, base_url: str) -> Dict:
    """Lista modelos disponibles para un proveedor LLM."""
    import requests

    provider = provider_type.lower().strip()
    url = base_url.rstrip("/")

    try:
        if provider == "ollama":
            response = requests.get(f"{url}/api/tags", timeout=8)
            response.raise_for_status()
            data = response.json()
            models = [
                item.get("name", "")
                for item in data.get("models", [])
                if item.get("name")
            ]
        elif provider == "openrouter":
            api_key = os.getenv("OPENROUTER_API_KEY")
            if not api_key:
                return {
                    "status": "needs-key",
                    "provider_type": provider,
                    "models": [],
                    "message": "OPENROUTER_API_KEY no esta configurado.",
                }
            headers = {
                "authorization": f"Bearer {api_key}",
                "http-referer": "https://geoagents.local",
                "x-title": "Geo Agents",
            }
            response = requests.get(f"{url}/models", headers=headers, timeout=12)
            response.raise_for_status()
            data = response.json()
            models = [
                item.get("id", "")
                for item in data.get("data", [])
                if item.get("id")
            ]
        elif provider in OPENAI_COMPATIBLE_PROVIDERS:
            api_key = os.getenv("OPENAI_API_KEY")
            headers = {}
            if api_key:
                headers["authorization"] = f"Bearer {api_key}"
            response = requests.get(f"{url}/models", headers=headers, timeout=12)
            response.raise_for_status()
            data = response.json()
            models = [
                item.get("id", "")
                for item in data.get("data", [])
                if item.get("id")
            ]
        else:
            return {
                "status": "error",
                "provider_type": provider,
                "models": [],
                "message": f"Listado de modelos no soportado para: {provider_type}",
            }

        return {
            "status": "ok",
            "provider_type": provider,
            "models": sorted(models),
        }
    except Exception as exc:
        return {
            "status": "error",
            "provider_type": provider,
            "models": [],
            "message": str(exc),
        }


def chat_llm_provider(
    provider_type: str,
    base_url: str,
    model: str,
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
    api_key: Optional[str] = None,
) -> Dict:
    """Envia mensajes a un proveedor LLM, opcionalmente con tools.

    Devuelve el objeto ``message`` completo tal cual lo devuelve la API,
    incluyendo ``tool_calls`` si el LLM decidio llamar una herramienta.
    """
    import requests

    provider = provider_type.lower().strip()
    url = base_url.rstrip("/")

    body: dict = {
        "model": model,
        "messages": messages,
    }
    if tools:
        body["tools"] = tools

    # Limites para reducir uso de RAM en proveedores locales
    LOCAL_CONTEXT_WINDOW = 3072  # ~3k tokens, como pediste
    LOCAL_MAX_TOKENS = 1024     # Max tokens generados

    try:
        if provider == "ollama":
            body["stream"] = False
            body["options"] = {
                "num_ctx": LOCAL_CONTEXT_WINDOW,
                "num_predict": LOCAL_MAX_TOKENS,
            }
            response = requests.post(
                f"{url}/api/chat",
                json=body,
                timeout=120,
            )
            response.raise_for_status()
            data = response.json()
            raw = data.get("message", {})
            usage = _normalize_usage(provider, data)
            return _make_chat_response(provider, model, raw, usage)

        if provider == "openrouter":
            key = api_key or os.getenv("OPENROUTER_API_KEY")
            if not key:
                return {
                    "status": "needs-key",
                    "provider_type": provider,
                    "model": model,
                    "message": "OPENROUTER_API_KEY no esta configurado.",
                }
            headers = {
                "authorization": f"Bearer {key}",
                "http-referer": "https://geoagents.local",
                "x-title": "Geo Agents",
                "content-type": "application/json",
            }
            response = requests.post(
                f"{url}/chat/completions",
                headers=headers,
                json=body,
                timeout=120,
            )
            response.raise_for_status()
            data = response.json()
            raw = data.get("choices", [{}])[0].get("message", {})
            usage = data.get("usage")
            return _make_chat_response(provider, model, raw, usage)

        if provider in OPENAI_COMPATIBLE_PROVIDERS:
            api_key_val = api_key or os.getenv("OPENAI_API_KEY")
            headers = {"content-type": "application/json"}
            if api_key_val:
                headers["authorization"] = f"Bearer {api_key_val}"

            # Solo ponemos max_tokens para proveedores locales (lmstudio)
            if provider == "lmstudio":
                body["max_tokens"] = LOCAL_MAX_TOKENS

            response = requests.post(
                f"{url}/chat/completions",
                headers=headers,
                json=body,
                timeout=120,
            )
            response.raise_for_status()
            data = response.json()
            raw = data.get("choices", [{}])[0].get("message", {})
            usage = data.get("usage")
            return _make_chat_response(provider, model, raw, usage)

        return {
            "status": "error",
            "provider_type": provider,
            "model": model,
            "message": f"Chat no soportado para proveedor: {provider_type}",
        }
    except Exception as exc:
        return {
            "status": "error",
            "provider_type": provider,
            "model": model,
            "message": str(exc),
        }


def _normalize_usage(provider: str, data: dict) -> dict | None:
    """Normaliza usage al formato OpenAI."""
    if provider == "ollama":
        prompt = data.get("prompt_eval_count")
        completion = data.get("eval_count")
        if prompt is not None or completion is not None:
            return {
                "prompt_tokens": prompt or 0,
                "completion_tokens": completion or 0,
                "total_tokens": (prompt or 0) + (completion or 0),
            }
    return data.get("usage")


REASONING_BUDGET_MAP = {
    "none": 0,
    "minimal": 1000,
    "medium": 5000,
    "high": 10000,
    "max": 20000,
}

def chat_llm_provider_stream(
    provider_type: str,
    base_url: str,
    model: str,
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
    api_key: Optional[str] = None,
    reasoning_effort: Optional[str] = None,
):
    """Envia mensajes a un proveedor LLM con streaming.

    Yields dicts:
      {"type": "delta", "content": "..."} — token de texto
      {"type": "done", "message": {...}, "usage": {...}} — respuesta completa
      {"type": "error", "message": "..."} — error
      {"type": "thinking", "content": "..."} — razonamiento (Anthropic/OpenAI)
    """
    import requests

    provider = provider_type.lower().strip()
    url = base_url.rstrip("/")

    body: dict = {
        "model": model,
        "messages": messages,
        "stream": True,
    }
    if tools:
        body["tools"] = tools

    # Limites para reducir uso de RAM en proveedores locales
    LOCAL_CONTEXT_WINDOW = 3072  # ~3k tokens, como pediste
    LOCAL_MAX_TOKENS = 1024     # Max tokens generados

    try:
        if provider == "ollama":
            body["options"] = {
                "num_ctx": LOCAL_CONTEXT_WINDOW,
                "num_predict": LOCAL_MAX_TOKENS,
            }
            response = requests.post(f"{url}/api/chat", json=body, stream=True, timeout=120)
            response.raise_for_status()
            full_content = ""
            full_reasoning = ""
            for line in response.iter_lines(decode_unicode=False):
                if not line:
                    continue
                if isinstance(line, bytes):
                    line = line.decode("utf-8")
                try:
                    chunk = json.loads(line)
                    content = chunk.get("message", {}).get("content", "")
                    if content:
                        full_content += content
                        yield {"type": "delta", "content": content}
                    reasoning = chunk.get("message", {}).get("reasoning_content", "")
                    if reasoning:
                        full_reasoning += reasoning
                        yield {"type": "thinking", "content": reasoning}
                    if chunk.get("done", False):
                        usage = {
                            "prompt_tokens": chunk.get("prompt_eval_count", 0),
                            "completion_tokens": chunk.get("eval_count", 0),
                            "total_tokens": (chunk.get("prompt_eval_count", 0) or 0) + (chunk.get("eval_count", 0) or 0),
                        }
                        tool_calls = chunk.get("message", {}).get("tool_calls")
                        msg = {"role": "assistant", "content": full_content}
                        if tool_calls:
                            msg["tool_calls"] = tool_calls
                        if full_reasoning:
                            msg["reasoning_content"] = full_reasoning
                        yield {"type": "done", "status": "ok", "provider_type": provider, "model": model, "message": msg, "usage": usage}
                        return
                except json.JSONDecodeError:
                    continue

        elif provider == "openrouter":
            key = api_key or os.getenv("OPENROUTER_API_KEY")
            if not key:
                yield {"type": "error", "message": "OPENROUTER_API_KEY no configurado"}
                return
            headers = {
                "authorization": f"Bearer {key}",
                "http-referer": "https://geoagents.local",
                "x-title": "Geo Agents",
                "content-type": "application/json",
            }
            response = requests.post(f"{url}/chat/completions", headers=headers, json=body, stream=True, timeout=120)
            response.raise_for_status()
            full_content = ""
            full_reasoning = ""
            tool_calls_map: dict = {}
            for line in response.iter_lines(decode_unicode=False):
                if not line:
                    continue
                if isinstance(line, bytes):
                    line = line.decode("utf-8")
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    continue
                try:
                    chunk = json.loads(data_str)
                    choices = chunk.get("choices", [])
                    if not choices:
                        continue
                    delta = choices[0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        full_content += content
                        yield {"type": "delta", "content": content}
                    reasoning = delta.get("reasoning_content", "")
                    if reasoning:
                        full_reasoning += reasoning
                        yield {"type": "thinking", "content": reasoning}
                    tc_deltas = delta.get("tool_calls")
                    if tc_deltas:
                        for tc in tc_deltas:
                            idx = tc.get("index", 0)
                            if idx not in tool_calls_map:
                                tool_calls_map[idx] = {"id": "", "type": "function", "function": {"name": "", "arguments": ""}}
                            tc_entry = tool_calls_map[idx]
                            if tc.get("id"):
                                tc_entry["id"] = tc["id"]
                            if tc.get("function", {}).get("name"):
                                tc_entry["function"]["name"] += tc["function"]["name"]
                            if tc.get("function", {}).get("arguments"):
                                tc_entry["function"]["arguments"] += tc["function"]["arguments"]
                    finish = choices[0].get("finish_reason")
                    if finish is not None:
                        msg = {"role": "assistant", "content": full_content}
                        if tool_calls_map:
                            msg["tool_calls"] = [tool_calls_map[k] for k in sorted(tool_calls_map)]
                        if full_reasoning:
                            msg["reasoning_content"] = full_reasoning
                        usage = chunk.get("usage")
                        yield {"type": "done", "status": "ok", "provider_type": provider, "model": model, "message": msg, "usage": usage}
                        return
                except json.JSONDecodeError:
                    continue

        elif provider in OPENAI_COMPATIBLE_PROVIDERS:
            api_key_val = api_key or os.getenv("OPENAI_API_KEY")
            headers = {"content-type": "application/json"}
            if api_key_val:
                headers["authorization"] = f"Bearer {api_key_val}"

            # Solo ponemos max_tokens para proveedores locales (lmstudio)
            if provider == "lmstudio":
                body["max_tokens"] = LOCAL_MAX_TOKENS

            response = requests.post(f"{url}/chat/completions", headers=headers, json=body, stream=True, timeout=120)
            response.raise_for_status()
            full_content = ""
            full_reasoning = ""
            tool_calls_map: dict = {}
            for line in response.iter_lines(decode_unicode=False):
                if not line:
                    continue
                if isinstance(line, bytes):
                    line = line.decode("utf-8")
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    continue
                try:
                    chunk = json.loads(data_str)
                    choices = chunk.get("choices", [])
                    if not choices:
                        continue
                    delta = choices[0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        full_content += content
                        yield {"type": "delta", "content": content}
                    reasoning = delta.get("reasoning_content", "")
                    if reasoning:
                        full_reasoning += reasoning
                        yield {"type": "thinking", "content": reasoning}
                    tc_deltas = delta.get("tool_calls")
                    if tc_deltas:
                        for tc in tc_deltas:
                            idx = tc.get("index", 0)
                            if idx not in tool_calls_map:
                                tool_calls_map[idx] = {"id": "", "type": "function", "function": {"name": "", "arguments": ""}}
                            tc_entry = tool_calls_map[idx]
                            if tc.get("id"):
                                tc_entry["id"] = tc["id"]
                            if tc.get("function", {}).get("name"):
                                tc_entry["function"]["name"] += tc["function"]["name"]
                            if tc.get("function", {}).get("arguments"):
                                tc_entry["function"]["arguments"] += tc["function"]["arguments"]
                    finish = choices[0].get("finish_reason")
                    if finish is not None:
                        msg = {"role": "assistant", "content": full_content}
                        if tool_calls_map:
                            msg["tool_calls"] = [tool_calls_map[k] for k in sorted(tool_calls_map)]
                        if full_reasoning:
                            msg["reasoning_content"] = full_reasoning
                        usage = chunk.get("usage")
                        yield {"type": "done", "status": "ok", "provider_type": provider, "model": model, "message": msg, "usage": usage}
                        return
                except json.JSONDecodeError:
                    continue

        elif provider == "anthropic":
            api_key_val = api_key or os.getenv("ANTHROPIC_API_KEY")
            if not api_key_val:
                yield {"type": "error", "message": "ANTHROPIC_API_KEY no configurado"}
                return
            headers = {
                "x-api-key": api_key_val,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            body.pop("stream", None)
            if reasoning_effort:
                budget = REASONING_BUDGET_MAP.get(reasoning_effort, 0)
                if budget > 0:
                    body["thinking"] = {"type": "enabled", "budget_tokens": budget}
            response = requests.post(f"{url}/v1/messages", headers=headers, json=body, stream=True, timeout=120)
            response.raise_for_status()
            full_content = ""
            full_reasoning = ""
            for line in response.iter_lines(decode_unicode=False):
                if not line:
                    continue
                if isinstance(line, bytes):
                    line = line.decode("utf-8")
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                try:
                    chunk = json.loads(data_str)
                    ctype = chunk.get("type")
                    if ctype == "content_block_delta":
                        delta = chunk.get("delta", {})
                        text = delta.get("text", "")
                        thinking = delta.get("thinking", "")
                        if text:
                            full_content += text
                            yield {"type": "delta", "content": text}
                        if thinking:
                            full_reasoning += thinking
                            yield {"type": "thinking", "content": thinking}
                    elif ctype == "content_block_start":
                        block = chunk.get("content_block", {})
                        btype = block.get("type")
                        if btype == "thinking":
                            thinking_text = block.get("thinking", "")
                            if thinking_text:
                                full_reasoning += thinking_text
                                yield {"type": "thinking", "content": thinking_text}
                        elif btype == "redacted_thinking":
                            yield {"type": "thinking", "content": "[thinking redacted by Anthropic]"}
                    elif ctype == "message_delta":
                        usage = chunk.get("usage")
                        msg = {"role": "assistant", "content": full_content}
                        if full_reasoning:
                            msg["reasoning_content"] = full_reasoning
                        stop_reason = chunk.get("delta", {}).get("stop_reason")
                        if stop_reason == "tool_use":
                            pass
                        yield {"type": "done", "status": "ok", "provider_type": provider, "model": model, "message": msg, "usage": usage}
                        return
                    elif ctype == "message_start":
                        pass
                except json.JSONDecodeError:
                    continue
        else:
            yield {"type": "error", "message": f"Chat streaming no soportado para: {provider_type}"}
            return

    except Exception as exc:
        yield {"type": "error", "message": str(exc)}


def _make_chat_response(provider: str, model: str, raw: dict, usage: dict | None = None) -> Dict:
    """Envuelve el mensaje crudo de la API en el envelope estandar del sidecar."""
    content = raw.get("content")
    tool_calls = raw.get("tool_calls")
    result: Dict = {
        "status": "ok",
        "provider_type": provider,
        "model": model,
        "message": {
            "role": "assistant",
            "content": content,
            "tool_calls": tool_calls,
        },
    }
    if usage:
        result["usage"] = usage
    return result
