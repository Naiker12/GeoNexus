"""Registry of tools available to the AI agent (inspired by Hermes tools/)."""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Callable, Awaitable

ToolFn = Callable[..., Awaitable[Any] | Any]

@dataclass
class Tool:
    name: str
    description: str
    fn: ToolFn
    parameters: dict[str, Any] = field(default_factory=dict)
    requires_confirm: bool = False

class ToolRegistry:
    """Central registry of all tools the agent can invoke."""

    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def list_tools(self) -> list[dict[str, Any]]:
        return [
            {"name": t.name, "description": t.description, "parameters": t.parameters}
            for t in self._tools.values()
        ]

    def execute(self, name: str, **kwargs: Any) -> Any:
        tool = self.get(name)
        if tool is None:
            raise ValueError(f"Tool '{name}' not found")
        return tool.fn(**kwargs)

# Singleton global
registry = ToolRegistry()
