"""Agent event callbacks — handles stream delta, tool calls, thinking events."""

from __future__ import annotations
from typing import Any, Callable, Protocol


class AgentCallbacks(Protocol):
    def on_delta(self, text: str) -> None: ...
    def on_thinking_start(self, step: dict[str, Any]) -> None: ...
    def on_thinking_delta(self, text: str) -> None: ...
    def on_thinking_end(self) -> None: ...
    def on_tool_call(self, name: str, args: dict[str, Any]) -> None: ...
    def on_tool_result(self, name: str, result: Any) -> None: ...
    def on_error(self, error: str) -> None: ...
    def on_done(self) -> None: ...


class CallbackHandler:
    """Routes agent events to typed callbacks."""

    def __init__(self, callbacks: AgentCallbacks):
        self._callbacks = callbacks

    def handle_event(self, event: dict[str, Any]) -> None:
        event_type = event.get("type", "")
        payload = event.get("payload", {})

        handlers = {
            "delta": lambda: self._callbacks.on_delta(payload.get("text", "")),
            "thinking_start": lambda: self._callbacks.on_thinking_start(payload),
            "thinking_delta": lambda: self._callbacks.on_thinking_delta(payload.get("text", "")),
            "thinking_end": lambda: self._callbacks.on_thinking_end(),
            "tool_call": lambda: self._callbacks.on_tool_call(payload.get("name", ""), payload.get("args", {})),
            "tool_result": lambda: self._callbacks.on_tool_result(payload.get("name", ""), payload.get("result")),
            "error": lambda: self._callbacks.on_error(payload.get("message", "")),
            "done": lambda: self._callbacks.on_done(),
        }

        handler = handlers.get(event_type)
        if handler:
            handler()
