"""Agent loop — core orchestration for the Python AI agent (inspired by Hermes run_agent.py)."""

from __future__ import annotations
from typing import Any, Callable, Awaitable

AgentCallback = Callable[..., Awaitable[None] | None]


class AgentLoop:
    """Orchestrates the agent lifecycle: think → tool → respond."""

    def __init__(self, provider: str, model: str, endpoint: str, api_key: str | None = None):
        self.provider = provider
        self.model = model
        self.endpoint = endpoint
        self.api_key = api_key
        self.callbacks: list[AgentCallback] = []

    def on_event(self, cb: AgentCallback) -> None:
        self.callbacks.append(cb)

    def _emit(self, event_type: str, payload: dict[str, Any]) -> None:
        for cb in self.callbacks:
            cb({"type": event_type, "payload": payload, "timestamp": __import__("time").time()})

    async def run(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None = None) -> str:
        from llm.router import chat_llm_provider_stream

        self._emit("thinking_start", {"phase": "reasoning"})
        full_response = []

        for chunk in chat_llm_provider_stream(
            self.provider, self.endpoint, self.model, messages, tools, api_key=self.api_key
        ):
            delta = chunk.get("delta", "")
            if delta:
                full_response.append(delta)
                self._emit("delta", {"text": delta})

            if "tool_calls" in chunk:
                self._emit("tool_call", chunk["tool_calls"])

        self._emit("done", {"response": "".join(full_response)})
        return "".join(full_response)
