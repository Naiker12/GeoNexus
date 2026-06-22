/** Reasoning display handler (inspired by Hermes reasoning_callback). */

export interface ReasoningStep {
  type: "thinking" | "tool_call" | "search" | "context_load" | "complete"
  label: string
  detail?: string
  timestamp: number
  durationMs?: number
}

export type ReasoningCallback = (step: ReasoningStep) => void

export class ReasoningTracker {
  private steps: ReasoningStep[] = []
  private callbacks: Set<ReasoningCallback> = new Set()
  private currentStepStart = 0

  onStep(cb: ReasoningCallback): () => void {
    this.callbacks.add(cb)
    return () => this.callbacks.delete(cb)
  }

  beginThinking(label: string, detail?: string) {
    this.currentStepStart = Date.now()
    const step: ReasoningStep = {
      type: "thinking",
      label,
      detail,
      timestamp: this.currentStepStart,
    }
    this.steps.push(step)
    this.callbacks.forEach((cb) => cb(step))
  }

  beginToolCall(label: string) {
    this.currentStepStart = Date.now()
    const step: ReasoningStep = {
      type: "tool_call",
      label,
      timestamp: this.currentStepStart,
    }
    this.steps.push(step)
    this.callbacks.forEach((cb) => cb(step))
  }

  completeCurrent() {
    if (this.steps.length === 0) return
    const last = this.steps[this.steps.length - 1]
    last.durationMs = Date.now() - this.currentStepStart
    this.callbacks.forEach((cb) => cb({ ...last, type: "complete" }))
  }

  getSteps(): ReasoningStep[] {
    return [...this.steps]
  }

  clear() {
    this.steps = []
  }
}
