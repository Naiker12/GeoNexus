"""OpenAI client wrapper placeholder"""
import os
from typing import Optional

def generate(prompt: str, model: str = "gpt-4o") -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return "[openai placeholder: missing OPENAI_API_KEY]"
    return f"[openai:{model} response to]: {prompt}"
