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

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResponse> {
  const invoke = await getInvoke()
  if (!invoke) throw new Error("Tauri no disponible")
  return invoke<SendMessageResponse>("send_message", { input })
}

export async function listConversations(projectId: string): Promise<Conversation[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  return invoke<Conversation[]>("list_conversations", { projectId })
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  return invoke<Message[]>("list_messages", { conversationId })
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const invoke = await getInvoke()
  if (!invoke) return
  return invoke("delete_conversation", { conversationId })
}

export async function getMentionableSources(
  projectId: string,
  query?: string
): Promise<MentionableSourcesResponse> {
  const invoke = await getInvoke()
  if (!invoke) return { connectors: [], assets: [], graph_nodes: [] }
  return invoke<MentionableSourcesResponse>("get_mentionable_sources", { projectId, query })
}

export async function recallChunks(
  projectId: string,
  query: string,
  limit: number = 5
): Promise<any[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  return invoke<any[]>("recall_chunks", { projectId, query, limit })
}

export async function getProjectContext(projectId: string): Promise<string> {
  const invoke = await getInvoke()
  if (!invoke) return ""
  return invoke<string>("get_project_context", { projectId })
}
