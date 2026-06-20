import type {
  Conversation,
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

export function getMentionableSources(
  projectId: string,
  query?: string
): Promise<MentionableSourcesResponse> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback("get_mentionable_sources", { projectId, query }, {
    assets: [],
    graph_nodes: [],
    connectors: []
  })
}
