"""OpenRouter LLM provider implementation"""

import os
import requests
from typing import Optional, Dict, List


def get_api_key() -> str:
    """Get OpenRouter API key from environment."""
    key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not key:
        raise ValueError("OPENROUTER_API_KEY environment variable not set")
    return key


def get_headers() -> Dict[str, str]:
    """Get headers for OpenRouter API requests."""
    api_key = get_api_key()
    return {
        "authorization": f"Bearer {api_key}",
        "http-referer": "https://geoagents.local",
        "x-title": "Geo Agents",
        "content-type": "application/json",
    }


def list_models(base_url: str = "https://openrouter.ai/api/v1") -> List[str]:
    """List available models from OpenRouter."""
    try:
        url = base_url.rstrip("/") + "/models"
        response = requests.get(url, headers=get_headers(), timeout=12)
        response.raise_for_status()
        data = response.json()
        models = [item.get("id", "") for item in data.get("data", []) if item.get("id")]
        return sorted(models)
    except Exception as e:
        raise RuntimeError(f"Failed to list OpenRouter models: {e}")


def generate(
    prompt: str,
    model: str = "openrouter/auto",
    base_url: str = "https://openrouter.ai/api/v1",
    max_tokens: int = 2048,
) -> str:
    """Generate text using OpenRouter."""
    try:
        url = base_url.rstrip("/") + "/chat/completions"
        response = requests.post(
            url,
            headers=get_headers(),
            json={
                "model": model,
                "stream": False,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("choices", [{}])[0].get("message", {}).get("content", "")
    except Exception as e:
        raise RuntimeError(f"Failed to generate with OpenRouter: {e}")


def ping(base_url: str = "https://openrouter.ai/api/v1", model: str = "openrouter/auto") -> bool:
    """Test connection to OpenRouter."""
    try:
        url = base_url.rstrip("/") + "/chat/completions"
        response = requests.post(
            url,
            headers=get_headers(),
            json={
                "model": model,
                "stream": False,
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "ping"}],
            },
            timeout=8,
        )
        return 200 <= response.status_code < 300
    except Exception:
        return False

