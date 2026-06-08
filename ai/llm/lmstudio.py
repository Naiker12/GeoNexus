"""LM Studio LLM provider implementation"""

import requests
from typing import List, Dict


def list_models(base_url: str = "http://localhost:1234/v1") -> List[str]:
    """List available models from LM Studio."""
    try:
        url = base_url.rstrip("/") + "/models"
        response = requests.get(url, timeout=8)
        response.raise_for_status()
        data = response.json()
        models = [item.get("id", "") for item in data.get("data", []) if item.get("id")]
        return sorted(models)
    except Exception as e:
        raise RuntimeError(f"Failed to list LM Studio models: {e}")


def generate(
    prompt: str,
    model: str = "",
    base_url: str = "http://localhost:1234/v1",
    max_tokens: int = 2048,
) -> str:
    """Generate text using LM Studio."""
    try:
        url = base_url.rstrip("/") + "/chat/completions"
        
        # If no model specified, try to get the loaded model
        if not model:
            try:
                models = list_models(base_url)
                model = models[0] if models else "default"
            except Exception:
                model = "default"
        
        response = requests.post(
            url,
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
        raise RuntimeError(f"Failed to generate with LM Studio: {e}")


def ping(base_url: str = "http://localhost:1234/v1", model: str = "") -> bool:
    """Test connection to LM Studio."""
    try:
        url = base_url.rstrip("/") + "/chat/completions"
        
        if not model:
            try:
                models = list_models(base_url)
                model = models[0] if models else "default"
            except Exception:
                model = "default"
        
        response = requests.post(
            url,
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
