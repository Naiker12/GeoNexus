export const AGENT_TASK_STATUSES = [
  "todo",
  "running",
  "review",
  "blocked",
  "done",
] as const;

export const AGENT_TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type AgentTaskStatus = (typeof AGENT_TASK_STATUSES)[number];
export type AgentTaskPriority = (typeof AGENT_TASK_PRIORITIES)[number];

export interface AgentTaskAttempt {
  id: string;
  startedAt: number;
  endedAt?: number;
  status: "running" | "succeeded" | "failed" | "cancelled";
  summary?: string;
}

export interface AgentTaskArtifact {
  id: string;
  label: string;
  path?: string;
  mimeType?: string;
}

export interface AgentTaskClaim {
  startedAt: number;
  heartbeatAt: number;
  expiresAt: number;
}

export interface AgentTask {
  id: string;
  title: string;
  notes?: string;
  status: AgentTaskStatus;
  priority: AgentTaskPriority;
  claim?: AgentTaskClaim;
  attempts: AgentTaskAttempt[];
  artifacts: AgentTaskArtifact[];
  comments: string[];
  blockedReason?: string;
  createdAt: number;
  updatedAt: number;
  projectPath?: string;
  connectorId?: string;
}

export type AgentTaskEvent =
  | { kind: "started";    taskId: string; }
  | { kind: "heartbeat";  taskId: string; note?: string; }
  | { kind: "comment";    taskId: string; text: string; }
  | { kind: "artifact";   taskId: string; artifact: AgentTaskArtifact; }
  | { kind: "completed";  taskId: string; summary: string; artifacts: AgentTaskArtifact[]; }
  | { kind: "blocked";    taskId: string; reason: string; }
  | { kind: "failed";     taskId: string; error: string; };
