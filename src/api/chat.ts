import type { Message, SendMessageInput, SendMessageResponse, Conversation, MentionableSourcesResponse } from "@/types/chat"

function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

async function getInvoke() {
  if (!isTauriAvailable()) return null
  try {
    const { invoke } = await import("@tauri-apps/api/core")
    return invoke
  } catch {
    return null
  }
}

async function invokeOrFallback<T>(command: string, args: Record<string, unknown>, fallback: T): Promise<T> {
  const invoke = await getInvoke()
  if (!invoke) return fallback
  try {
    return await invoke<T>(command, args)
  } catch (e) {
    console.error(`[invokeOrFallback] Error en ${command}:`, e)
    return fallback
  }
}

export async function listConversations(projectId: string): Promise<Conversation[]> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback("list_conversations", { projectId }, [])
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  if (!conversationId.trim()) throw new Error("conversation_id requerido")
  return invokeOrFallback("list_messages", { conversationId }, [])
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResponse> {
  if (!input.project_id.trim()) throw new Error("project_id requerido")
  if (!input.content.trim()) throw new Error("content requerido")
  if (!input.provider.trim()) throw new Error("provider requerido")
  if (!input.model.trim()) throw new Error("model requerido")
  if (!input.endpoint.trim()) throw new Error("endpoint requerido")

  return invokeOrFallback("send_message", { input }, {
    conversation_id: "demo-conversation-id",
    chunks_used: [],
    trace_id: "demo-trace-id",
    message: {
      id: "demo-message-id",
      conversation_id: "demo-conversation-id",
      role: "assistant",
      content: "Esto es una respuesta de demostración. Para usar la app completa, ejecútala en el runtime Tauri.",
      provider: input.provider,
      model: input.model,
      created_at: Date.now(),
      trace_id: "demo-trace-id",
      chunks_used: [],
      nodes_used: [],
      tool_calls: [],
      sources: []
    },
    research_sources: []
  })
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const invoke = await getInvoke()
  if (!invoke) return
  return invoke("delete_conversation", { conversationId })
}

export async function getProjectContext(projectId: string): Promise<any> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback("get_project_context", { projectId }, {
    toggles: { rag_chunks: true, indexed_assets: true, graph_nodes: true },
    sources: [],
    assets: [],
    graph_nodes: []
  })
}

export async function recallChunks(projectId: string, query: string, topK = 4): Promise<any[]> {
  return invokeOrFallback("recall_chunks", {
    input: { project_id: projectId, query, top_k: topK },
  }, [])
}

export async function getMentionableSources(projectId: string, query?: string): Promise<MentionableSourcesResponse> {
  const invoke = await getInvoke()
  if (!invoke) return { connectors: [], assets: [], graph_nodes: [] }
  return invoke<MentionableSourcesResponse>("get_mentionable_sources", { projectId, query })
}
