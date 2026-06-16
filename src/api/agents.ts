/** Detecta si estamos dentro del runtime Tauri o en navegador (vite dev server) */
function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

/** Obtains invoke function safely, returning null if Tauri isn't available */
async function getInvoke() {
  if (!isTauriAvailable()) return null
  try {
    const { invoke } = await import("@tauri-apps/api/core")
    return invoke
  } catch {
    return null
  }
}

async function invokeRequired<T>(command: string, args: Record<string, unknown>): Promise<T> {
  const invoke = await getInvoke()
  if (!invoke) throw new Error("Tauri not available")
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
  const invoke = await getInvoke()
  if (!invoke) return []
  return invokeRequired("list_agents", {})
}

export async function toggleAgent(agentId: string, active: boolean): Promise<void> {
  const invoke = await getInvoke()
  if (!invoke) return
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
  const invoke = await getInvoke()
  if (!invoke) return []
  return invokeRequired("recall_chunks", {
    input: {
      project_id: projectId,
      query,
      top_k: topK ?? 4,
      collection: collection ?? "project_memory",
    },
  })
}