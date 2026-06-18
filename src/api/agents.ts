import type { Agent, AgentSession } from "@/types/agents"

/** Detecta si estamos dentro del runtime Tauri o en navegador (vite dev server) */
function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

/** Obtains invoke function safely, returning null if Tauri isn't available */
async function getInvoke(): Promise<typeof import('@tauri-apps/api/core').invoke | null> {
  if (!isTauriAvailable()) return null
  try {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
    return tauriInvoke
  } catch (e) {
    console.error('[getInvoke] Could not import invoke:', e)
    return null
  }
}

export async function listAgents(): Promise<Agent[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  return invoke<Agent[]>("list_agents")
}

export async function toggleAgent(agentId: string, enabled: boolean): Promise<void> {
  const invoke = await getInvoke()
  if (!invoke) return
  return invoke("toggle_agent", { agentId, enabled })
}

export async function runAgentPipeline(agentId: string, traceId: string): Promise<AgentSession> {
  const invoke = await getInvoke()
  if (!invoke) throw new Error("Tauri no disponible")
  return invoke<AgentSession>("run_agent_pipeline", { agentId, traceId })
}