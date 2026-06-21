import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { AgentTask, AgentTaskStatus, AgentTaskPriority, AgentTaskEvent } from "../types";

interface AgentTaskStore {
  tasks: AgentTask[];
  isLoading: boolean;
  mode: "chat" | "agent";
  setMode: (mode: "chat" | "agent") => void;

  loadTasks: () => Promise<void>;
  createTask: (params: {
    title: string;
    notes?: string;
    priority?: AgentTaskPriority;
    projectPath?: string;
    connectorId?: string;
  }) => Promise<AgentTask>;
  startTask: (taskId: string) => Promise<void>;
  cancelTask: (taskId: string) => Promise<void>;
  retryTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  applyEvent: (event: AgentTaskEvent) => void;
}

export const useAgentTaskStore = create<AgentTaskStore>((set, get) => ({
  tasks: [],
  isLoading: false,
  mode: "chat",

  setMode: (mode) => set({ mode }),

  loadTasks: async () => {
    set({ isLoading: true });
    try {
      const tasks = await invoke<AgentTask[]>("agent_list_tasks");
      set({ tasks, isLoading: false });
    } catch (err) {
      console.error("[AgentTaskStore] loadTasks failed:", err);
      set({ isLoading: false });
    }
  },

  createTask: async (params) => {
    const task = await invoke<AgentTask>("agent_create_task", params);
    set((s) => ({ tasks: [task, ...s.tasks] }));
    return task;
  },

  startTask: async (taskId) => {
    await invoke("agent_start_task", { taskId });
  },

  cancelTask: async (taskId) => {
    await invoke("agent_cancel_task", { taskId });
  },

  retryTask: async (taskId) => {
    await invoke("agent_retry_task", { taskId });
  },

  deleteTask: async (taskId) => {
    await invoke("agent_delete_task", { taskId });
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }));
  },

  applyEvent: (event) => {
    set((s) => ({
      tasks: s.tasks.map((task) => {
        if (task.id !== event.taskId) return task;
        const now = Date.now();
        switch (event.kind) {
          case "started":
            return {
              ...task,
              status: "running" as const,
              claim: { startedAt: now, heartbeatAt: now, expiresAt: now + 60_000 },
              updatedAt: now,
            };
          case "heartbeat":
            return {
              ...task,
              claim: task.claim
                ? { ...task.claim, heartbeatAt: now, expiresAt: now + 60_000 }
                : undefined,
              comments: event.note
                ? [...task.comments, event.note]
                : task.comments,
              updatedAt: now,
            };
          case "comment":
            return {
              ...task,
              comments: [...task.comments, event.text],
              updatedAt: now,
            };
          case "artifact":
            return {
              ...task,
              artifacts: [...task.artifacts, event.artifact],
              updatedAt: now,
            };
          case "completed":
            return {
              ...task,
              status: "done" as const,
              claim: undefined,
              artifacts: [...task.artifacts, ...event.artifacts],
              comments: [...task.comments, `✓ ${event.summary}`],
              attempts: [
                ...task.attempts,
                { id: crypto.randomUUID(), startedAt: task.claim?.startedAt ?? now,
                  endedAt: now, status: "succeeded" as const, summary: event.summary },
              ],
              updatedAt: now,
            };
          case "blocked":
            return {
              ...task,
              status: "blocked" as const,
              claim: undefined,
              blockedReason: event.reason,
              updatedAt: now,
            };
          case "failed":
            return {
              ...task,
              status: "blocked" as const,
              claim: undefined,
              blockedReason: `Error: ${event.error}`,
              attempts: [
                ...task.attempts,
                { id: crypto.randomUUID(), startedAt: task.claim?.startedAt ?? now,
                  endedAt: now, status: "failed" as const },
              ],
              updatedAt: now,
            };
          default:
            return task;
        }
      }),
    }));
  },
}));
