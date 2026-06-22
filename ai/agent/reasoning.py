"""Reasoning step tracker — mirrors the frontend ReasoningTracker."""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Callable
from datetime import datetime


@dataclass
class ReasoningStep:
    type: str  # "thinking" | "tool_call" | "search" | "context_load"
    label: str
    detail: str | None = None
    timestamp: float = 0.0
    duration_ms: int | None = None


ReasoningCallback = Callable[[ReasoningStep], None]


class ReasoningTracker:
    def __init__(self):
        self.steps: list[ReasoningStep] = []
        self.callbacks: list[ReasoningCallback] = []
        self._step_start: float = 0.0

    def on_step(self, cb: ReasoningCallback) -> None:
        self.callbacks.append(cb)

    def begin(self, type_: str, label: str, detail: str | None = None) -> None:
        self._step_start = datetime.now().timestamp()
        step = ReasoningStep(type=type_, label=label, detail=detail, timestamp=self._step_start)
        self.steps.append(step)
        for cb in self.callbacks:
            cb(step)

    def end_current(self) -> None:
        if not self.steps:
            return
        last = self.steps[-1]
        last.duration_ms = int((datetime.now().timestamp() - self._step_start) * 1000)

    def get_steps(self) -> list[dict[str, Any]]:
        return [{"type": s.type, "label": s.label, "detail": s.detail, "duration_ms": s.duration_ms} for s in self.steps]

    def clear(self) -> None:
        self.steps.clear()
