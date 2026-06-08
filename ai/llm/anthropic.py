"""Anthropic LLM provider implementation"""

import os
import requests
from typing import List, Dict


ANTHROPIC_MODELS = [
    "claude-opus-4-1",
    "claude-opus-4",
    "claude-sonnet-4",
    "claude-haiku-3",
]


def get_api_key() -> str:
    """Get Anthropic API key from environment."""
    key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    return key


def get_headers() -> Dict[str, str]:
    """Get headers for Anthropic API requests."""
    api_key = get_api_key()
    return {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }


def list_models(base_url: str = "https://api.anthropic.com") -> List[str]:
    """List available models from Anthropic (hardcoded, as API doesn't list models)."""
    return ANTHROPIC_MODELS


def generate(
    prompt: str,
    model: str = "claude-sonnet-4",
    base_url: str = "https://api.anthropic.com",
    max_tokens: int = 2048,
) -> str:
    """Generate text using Anthropic."""
    try:
        url = base_url.rstrip("/") + "/v1/messages"
        response = requests.post(
            url,
            headers=get_headers(),
            json={
                "model": model,
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("content", [{}])[0].get("text", "")
    except Exception as e:
        raise RuntimeError(f"Failed to generate with Anthropic: {e}")


def ping(base_url: str = "https://api.anthropic.com", model: str = "claude-sonnet-4") -> bool:
    """Test connection to Anthropic."""
    try:
        url = base_url.rstrip("/") + "/v1/messages"
        response = requests.post(
            url,
            headers=get_headers(),
            json={
                "model": model,
                "max_tokens": 1,
                "messages": [{"role": "user", "content": "ping"}],
            },
            timeout=8,
        )
        return 200 <= response.status_code < 300
    except Exception:
        return False
