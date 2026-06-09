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
                "x-title": "GeoNexus",
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
                "http-referer": "https://geonexus.local",
                "x-title": "GeoNexus",
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

    try:
        if provider == "ollama":
            body["stream"] = False
            response = requests.post(
                f"{url}/api/chat",
                json=body,
                timeout=120,
            )
            response.raise_for_status()
            data = response.json()
            raw = data.get("message", {})
            return _make_chat_response(provider, model, raw)

        if provider == "openrouter":
            api_key = os.getenv("OPENROUTER_API_KEY")
            if not api_key:
                return {
                    "status": "needs-key",
                    "provider_type": provider,
                    "model": model,
                    "message": "OPENROUTER_API_KEY no esta configurado.",
                }
            headers = {
                "authorization": f"Bearer {api_key}",
                "http-referer": "https://geonexus.local",
                "x-title": "GeoNexus",
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
            return _make_chat_response(provider, model, raw)

        if provider in OPENAI_COMPATIBLE_PROVIDERS:
            api_key = os.getenv("OPENAI_API_KEY")
            headers = {"content-type": "application/json"}
            if api_key:
                headers["authorization"] = f"Bearer {api_key}"

            response = requests.post(
                f"{url}/chat/completions",
                headers=headers,
                json=body,
                timeout=120,
            )
            response.raise_for_status()
            data = response.json()
            raw = data.get("choices", [{}])[0].get("message", {})
            return _make_chat_response(provider, model, raw)

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


def _make_chat_response(provider: str, model: str, raw: dict) -> Dict:
    """Envuelve el mensaje crudo de la API en el envelope estandar del sidecar."""
    content = raw.get("content")
    tool_calls = raw.get("tool_calls")
    return {
        "status": "ok",
        "provider_type": provider,
        "model": model,
        "message": {
            "role": "assistant",
            "content": content,
            "tool_calls": tool_calls,
        },
    }
