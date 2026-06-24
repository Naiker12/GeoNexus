import type {
  Conversation,
  ConversationSearchResult,
  MentionableSourcesResponse,
  Message,
  ProjectContext,
  RecallChunk,
  SendMessageInput,
  SendMessageResponse,
} from "@/types/chat"

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

async function invokeOrFallback<T>(
  command: string,
  args: Record<string, unknown>,
  fallback: T
): Promise<T> {
  const invoke = await getInvoke()
  if (!invoke) {
    console.debug(`[invokeOrFallback] Tauri no disponible, devolviendo fallback para ${command}`)
    return fallback
  }
  try {
    return await invoke<T>(command, args)
  } catch (e) {
    if (import.meta.env.DEV) {
      console.debug(`[invokeOrFallback] ${command} no disponible:`, e)
    }
    return fallback
  }
}

async function invokeRequired<T>(
  command: string,
  args: Record<string, unknown>
): Promise<T> {
  const invoke = await getInvoke()
  if (!invoke) {
    throw new Error(`No se puede ejecutar ${command} fuera del runtime Tauri`)
  }
  try {
    return await invoke<T>(command, args)
  } catch (e) {
    throw new Error(`Error al ejecutar ${command}: ${e}`)
  }
}

export async function sendMessage(
  input: SendMessageInput
): Promise<SendMessageResponse> {
  if (!input.project_id.trim()) throw new Error("project_id requerido")
  if (!input.content.trim()) throw new Error("content requerido")
  if (!input.provider.trim()) throw new Error("provider requerido")
  if (!input.model.trim()) throw new Error("model requerido")
  if (!input.endpoint.trim()) throw new Error("endpoint requerido")

  return invokeRequired("send_message", { input })
}

export function deleteConversation(conversationId: string): Promise<void> {
  if (!conversationId.trim()) throw new Error("conversation_id requerido")
  return invokeOrFallback("delete_conversation", { conversationId }, undefined)
}

export function archiveConversation(conversationId: string): Promise<void> {
  if (!conversationId.trim()) throw new Error("conversation_id requerido")
  return invokeOrFallback("archive_conversation", { conversationId }, undefined)
}

export function unarchiveConversation(conversationId: string): Promise<void> {
  if (!conversationId.trim()) throw new Error("conversation_id requerido")
  return invokeOrFallback("unarchive_conversation", { conversationId }, undefined)
}

export function listArchivedConversations(projectId: string): Promise<Conversation[]> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback("list_archived_conversations", { projectId }, [])
}

export function searchConversations(projectId: string, query: string): Promise<ConversationSearchResult[]> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback("search_conversations", { projectId, query }, [])
}

export function listConversations(projectId: string): Promise<Conversation[]> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback("list_conversations", { projectId }, [])
}

export function listMessages(conversationId: string): Promise<Message[]> {
  if (!conversationId.trim()) throw new Error("conversation_id requerido")
  return invokeOrFallback("list_messages", { conversationId }, [])
}

export function getProjectContext(projectId: string): Promise<ProjectContext> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback("get_project_context", { projectId }, {
    assets: [],
    graph_nodes: []
  })
}

export function recallChunks(
  projectId: string,
  query: string,
  topK = 4
): Promise<RecallChunk[]> {
  return invokeOrFallback("recall_chunks", {
    input: { project_id: projectId, query, top_k: topK },
  }, [])
}

export interface Automation {
  id: string
  project_id: string
  name: string
  description: string | null
  cron_expression: string | null
  intent: string
  action_type: string
  action_config: any
  channel: string
  enabled: boolean
  last_run_at: number | null
  next_run_at: number | null
  run_count: number
  created_at: number
  updated_at: number
}

export function createAutomation(payload: {
  projectId: string
  name: string
  description?: string
  intent: string
  actionType: string
  actionConfig?: any
  channel: string
  cronExpression?: string
}): Promise<Automation> {
  return invokeRequired("create_automation", payload)
}

export function listAutomations(projectId: string): Promise<Automation[]> {
  return invokeOrFallback("list_automations", { projectId }, [])
}

export function toggleAutomation(id: string, enabled: boolean): Promise<Automation> {
  return invokeRequired("toggle_automation", { id, enabled })
}

export function updateAutomation(payload: {
  id: string
  name: string
  description?: string
  intent: string
  actionType: string
  actionConfig?: any
  channel: string
  cronExpression?: string
  enabled: boolean
}): Promise<Automation> {
  return invokeRequired("update_automation", payload)
}

export function deleteAutomation(id: string): Promise<void> {
  return invokeRequired("delete_automation", { id })
}

export function translateNlToCron(query: string): Promise<{ cron_expression: string; confidence: number }> {
  return invokeOrFallback("translate_nl_to_cron", { query }, { cron_expression: "0 0 * * *", confidence: 0 })
}

export interface PatchProposal {
  id: string
  project_id: string
  conversation_id: string
  file_path: string
  original_content: string | null
  proposed_content: string
  diff: string | null
  status: "pending" | "approved" | "rejected" | "applied"
  created_at: number
  updated_at: number
}

export function listPatches(projectId: string, status?: string): Promise<PatchProposal[]> {
  return invokeOrFallback("list_patches", { projectId, status }, [])
}

export function updatePatchStatus(id: string, status: string): Promise<PatchProposal> {
  return invokeRequired("update_patch_status", { id, status })
}

export function deletePatch(id: string): Promise<void> {
  return invokeRequired("delete_patch", { id })
}

export function startSchedulerWorker(): Promise<string> {
  return invokeOrFallback("start_scheduler_worker", {}, "Scheduler not available")
}

export function stopSchedulerWorker(): Promise<string> {
  return invokeOrFallback("stop_scheduler_worker", {}, "Scheduler not available")
}

export function getMentionableSources(
  projectId: string,
  query?: string
): Promise<MentionableSourcesResponse> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback("get_mentionable_sources", { projectId, query }, {
    assets: [],
    graph_nodes: [],
    connectors: [],
    mcp_servers: []
  })
}

export function exportConversationTrajectory(conversationId: string): Promise<any> {
  return invokeRequired("export_conversation_trajectory", { conversationId })
}

export function exportConversationsSharegpt(projectId: string): Promise<any[]> {
  return invokeRequired("export_conversations_sharegpt", { projectId })
}
