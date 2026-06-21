import { invoke } from "@tauri-apps/api/core"
import type { Agent } from "./types"

export function listAgents(): Promise<Agent[]> {
  return invoke<Agent[]>("list_agents")
}

export function toggleAgent(agentId: string, active: boolean): Promise<void> {
  return invoke("toggle_agent", { agentId, active })
}

export function setAgentModel(agentId: string, modelName: string | null): Promise<void> {
  return invoke("set_agent_model", { agentId, modelName })
}
