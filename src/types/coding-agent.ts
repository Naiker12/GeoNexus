export type AgentMode = "chat" | "agent"

export type AgentStatus =
  | "idle"
  | "thinking"
  | "planning"
  | "planning_review"
  | "coding"
  | "error"
  | "done"

export type AgentEventType =
  | "plan"
  | "step_start"
  | "step_complete"
  | "step_error"
  | "file_created"
  | "file_modified"
  | "tool_call"
  | "tool_result"
  | "thinking"
  | "error"
  | "cleanup_result"
  | "preview_ready"

export interface AgentEvent {
  id: string
  type: AgentEventType
  label: string
  detail?: string
  status: "pending" | "running" | "done" | "error"
  timestamp: number
  duration?: number
}

export type FileStatus = "pending" | "creating" | "done" | "error"

export interface FileNode {
  path: string
  name: string
  type: "file" | "directory"
  status?: FileStatus
  children?: FileNode[]
  content?: string
  language?: string
  isOriginal?: boolean
}

export interface CleanupReport {
  totalFiles: number
  removedFiles: number
  unusedImports: number
  deadCode: number
  details: string[]
}

export interface AgentPlanFile {
  path: string
  language: string
  shortDescription: string
  content: string
  risk: "low" | "high"
  reason: string
}

export interface AgentPlan {
  summary: string
  files: AgentPlanFile[]
}

export interface PermissionRequest {
  id: string
  action: "overwrite" | "delete" | "write_outside_project"
  targetPath: string
  reason: string
}

export interface LoadedProject {
  name: string
  summary: string
  files: FileNode[]
}

export interface CodingAgentState {
  mode: AgentMode
  status: AgentStatus
  events: AgentEvent[]
  files: FileNode[]
  activeFile: FileNode | null
  previewUrl: string | null
  plan: string | null
  error: string | null
  cleanupReport: CleanupReport | null
  currentPlan: AgentPlan | null
  pendingPermissions: PermissionRequest[]
  loadedProject: LoadedProject | null
}
