"""Centralized configuration for GeoNexus AI sidecar (inspired by Hermes constants)."""

import os
from pathlib import Path

GEONEXUS_HOME = Path(os.environ.get("GEONEXUS_HOME", Path.home() / ".geonexus"))


class Config:
    # DB
    db_path: str = os.environ.get("GEONEXUS_DB_PATH", str(GEONEXUS_HOME / "geonexus.db"))

    # LLM
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")
    anthropic_api_key: str = os.environ.get("ANTHROPIC_API_KEY", "")
    openrouter_api_key: str = os.environ.get("OPENROUTER_API_KEY", "")

    # Embeddings
    openai_embedding_model: str = os.environ.get("GEONEXUS_OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
    ollama_embedding_model: str = os.environ.get("GEONEXUS_OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
    ollama_embedding_url: str = os.environ.get("GEONEXUS_OLLAMA_EMBEDDING_URL", "http://localhost:11434")

    # Features
    local_root: str = os.environ.get("GEONEXUS_LOCAL_ROOT", str(GEONEXUS_HOME / "local"))


config = Config()
