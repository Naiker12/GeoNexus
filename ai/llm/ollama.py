"""Ollama LLM provider implementation"""

import requests
from typing import List, Dict, Optional


def list_models(base_url: str = "http://localhost:11434") -> List[str]:
    """List available models from Ollama."""
    try:
        url = base_url.rstrip("/") + "/api/tags"
        response = requests.get(url, timeout=8)
        response.raise_for_status()
        data = response.json()
        models = [item.get("name", "") for item in data.get("models", []) if item.get("name")]
        return sorted(models)
    except Exception as e:
        raise RuntimeError(f"Failed to list Ollama models: {e}")


def generate(
    prompt: str,
    model: str = "mistral",
    base_url: str = "http://localhost:11434",
    max_tokens: int = 2048,
) -> str:
    """Generate text using Ollama."""
    try:
        url = base_url.rstrip("/") + "/api/chat"
        response = requests.post(
            url,
            json={
                "model": model,
                "stream": False,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("message", {}).get("content", "")
    except Exception as e:
        raise RuntimeError(f"Failed to generate with Ollama: {e}")


def ping(base_url: str = "http://localhost:11434") -> bool:
    """Test connection to Ollama."""
    try:
        url = base_url.rstrip("/") + "/api/tags"
        response = requests.get(url, timeout=3)
        return 200 <= response.status_code < 300
    except Exception:
        return False
