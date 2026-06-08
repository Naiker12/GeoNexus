import os
import time
from typing import Dict


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
        elif provider in OPENAI_COMPATIBLE_PROVIDERS:
            response = requests.get(f"{url}/models", timeout=5)
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


def chat_llm_provider(provider_type: str, base_url: str, model: str, prompt: str) -> Dict:
    """Envia un mensaje simple sin tools ni streaming a un proveedor LLM."""
    import requests

    provider = provider_type.lower().strip()
    url = base_url.rstrip("/")

    try:
        if provider == "ollama":
            response = requests.post(
                f"{url}/api/chat",
                json={
                    "model": model,
                    "stream": False,
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=60,
            )
            response.raise_for_status()
            data = response.json()
            return {
                "status": "ok",
                "provider_type": provider,
                "model": model,
                "text": data.get("message", {}).get("content", ""),
            }

        if provider in OPENAI_COMPATIBLE_PROVIDERS:
            api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENROUTER_API_KEY")
            headers = {"content-type": "application/json"}
            if api_key:
                headers["authorization"] = f"Bearer {api_key}"

            response = requests.post(
                f"{url}/chat/completions",
                headers=headers,
                json={
                    "model": model,
                    "stream": False,
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=60,
            )
            response.raise_for_status()
            data = response.json()
            return {
                "status": "ok",
                "provider_type": provider,
                "model": model,
                "text": data.get("choices", [{}])[0].get("message", {}).get("content", ""),
            }

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
