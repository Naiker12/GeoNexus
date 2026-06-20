export type AgentStepType =
  | "planner"
  | "discovery"
  | "tool"
  | "coding"
  | "report"
  | "terminal"
  | "custom"

export type StepStatus = "pending" | "running" | "success" | "failed"

export interface ReasoningStep {
  id: string
  agentName: string
  agentType: AgentStepType
  status: StepStatus
  label: string
  subItems: string[]
  durationMs?: number
  startedAt: number
  completedAt?: number
}

export interface ReasoningTimeline {
  sessionId: string
  totalSteps: number
  totalDurationMs: number
  steps: ReasoningStep[]
  isCollapsed: boolean
}

export interface ReasoningStartPayload {
  session_id: string
}

export interface ReasoningStepPayload {
  id: string
  agent_name: string
  agent_type: string
  status: string
  label: string
  sub_items: string[]
  duration_ms?: number
  started_at: number
  completed_at?: number
}

export interface ReasoningSubItemPayload {
  step_id: string
  text: string
}

export interface ReasoningEndPayload {
  session_id: string
  total_ms: number
}
