import { invoke } from "@tauri-apps/api/core"

async function invokeRequired<T>(command: string, args: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args)
  } catch (err) {
    throw new Error(String(err))
  }
}

export interface AgentRow {
  id: string
  project_id: string
  name: string
  kind: string
  description: string | null
  is_active: boolean
  config: string | null
  model: string | null
  provider: string | null
  created_at: string
  updated_at: string
}

export async function listAgents(): Promise<AgentRow[]> {
  return invokeRequired("list_agents", {})
}

export async function toggleAgent(agentId: string, active: boolean): Promise<void> {
  return invokeRequired("toggle_agent", { agentId, active })
}

export async function runAgentPipeline(
  goal: string,
  sources?: string[],
  traceId?: string
): Promise<string> {
  return invokeRequired("run_agent_pipeline", {
    goal,
    sources: sources ?? [],
    traceId: traceId ?? crypto.randomUUID(),
  })
}

export async function recallChunks(
  projectId: string,
  query: string,
  topK?: number,
  collection?: string
): Promise<Array<{ text: string; source: string; asset_id: string; score: number }>> {
  return invokeRequired("recall_chunks", {
    input: {
      project_id: projectId,
      query,
      top_k: topK ?? 4,
      collection: collection ?? "project_memory",
    },
  })
}