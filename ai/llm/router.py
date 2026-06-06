"""Unified LLM router to pick a provider."""
from typing import Callable

from . import openai, openrouter, ollama, lmstudio, anthropic

PROVIDERS = {
    "openai": openai.generate,
    "openrouter": openrouter.generate,
    "ollama": ollama.generate,
    "lmstudio": lmstudio.generate,
    "anthropic": anthropic.generate,
}

def generate(prompt: str, provider: str = "openai") -> str:
    fn: Callable = PROVIDERS.get(provider, openai.generate)
    return fn(prompt)
