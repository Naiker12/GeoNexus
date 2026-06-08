"""OpenAI client wrapper placeholder"""
import os

def generate(prompt: str, model: str | None = None) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return "[openai placeholder: missing OPENAI_API_KEY]"
    selected_model = model or os.getenv("GEONEXUS_OPENAI_MODEL")
    if not selected_model:
        return "[openai placeholder: missing model]"
    return f"[openai:{selected_model} response to]: {prompt}"
