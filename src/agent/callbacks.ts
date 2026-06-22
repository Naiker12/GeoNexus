/** Agent callbacks: stream_delta, tool_progress, thinking (inspired by Hermes callbacks/). */

import type { AgentEvent } from "./loop"
import type { ReasoningStep } from "./reasoning"

export interface AgentCallbacks {
  onDelta?: (text: string) => void
  onThinkingStart?: (step: ReasoningStep) => void
  onThinkingDelta?: (text: string) => void
  onThinkingEnd?: () => void
  onToolCall?: (name: string, args: unknown) => void
  onToolResult?: (name: string, result: unknown) => void
  onError?: (error: string) => void
  onDone?: () => void
}

export function createCallbackHandler(callbacks: AgentCallbacks) {
  return (event: AgentEvent) => {
    switch (event.type) {
      case "delta":
        callbacks.onDelta?.(event.payload as string)
        break
      case "thinking_start":
        callbacks.onThinkingStart?.(event.payload as ReasoningStep)
        break
      case "thinking_delta":
        callbacks.onThinkingDelta?.(event.payload as string)
        break
      case "thinking_end":
        callbacks.onThinkingEnd?.()
        break
      case "tool_call":
        const tc = event.payload as { name: string; args: unknown }
        callbacks.onToolCall?.(tc.name, tc.args)
        break
      case "tool_result":
        const tr = event.payload as { name: string; result: unknown }
        callbacks.onToolResult?.(tr.name, tr.result)
        break
      case "error":
        callbacks.onError?.((event.payload as { message: string }).message)
        break
      case "done":
        callbacks.onDone?.()
        break
    }
  }
}
