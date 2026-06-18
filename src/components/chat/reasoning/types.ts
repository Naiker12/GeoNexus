export type PipelineStepStatus = "pending" | "active" | "done" | "error"

export type PipelineStepKind =
  | "intent"
  | "graph"
  | "rag"
  | "context"
  | "web_search"
  | "tool_call"
  | "generating"

export interface PipelineStep {
  id: string
  kind: PipelineStepKind
  label: string
  metadata?: string
  status: PipelineStepStatus
  durationMs?: number
}

export interface PipelineState {
  steps: PipelineStep[]
  status: "running" | "completed" | "error"
  totalDurationMs?: number
}

export interface ToolCallRecord {
  id: string
  toolName: string
  args: Record<string, unknown>
  resultSummary?: string
  durationMs?: number
  status: "pending" | "done" | "error"
}
