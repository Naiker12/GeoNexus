"""OpenAI LLM provider implementation"""

import os
import requests
from typing import List, Dict


def get_api_key() -> str:
    """Get OpenAI API key from environment."""
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        raise ValueError("OPENAI_API_KEY environment variable not set")
    return key


def get_headers() -> Dict[str, str]:
    """Get headers for OpenAI API requests."""
    api_key = get_api_key()
    return {
        "authorization": f"Bearer {api_key}",
        "content-type": "application/json",
    }


def list_models(base_url: str = "https://api.openai.com/v1") -> List[str]:
    """List available models from OpenAI."""
    try:
        url = base_url.rstrip("/") + "/models"
        response = requests.get(url, headers=get_headers(), timeout=12)
        response.raise_for_status()
        data = response.json()
        # Filter to only chat models
        models = [
            item.get("id", "")
            for item in data.get("data", [])
            if item.get("id") and ("gpt" in item.get("id", "").lower())
        ]
        return sorted(models)
    except Exception as e:
        raise RuntimeError(f"Failed to list OpenAI models: {e}")


def generate(
    prompt: str,
    model: str = "gpt-3.5-turbo",
    base_url: str = "https://api.openai.com/v1",
    max_tokens: int = 2048,
) -> str:
    """Generate text using OpenAI."""
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
        raise RuntimeError(f"Failed to generate with OpenAI: {e}")


def ping(base_url: str = "https://api.openai.com/v1", model: str = "gpt-3.5-turbo") -> bool:
    """Test connection to OpenAI."""
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
