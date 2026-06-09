import { invoke } from '@tauri-apps/api/core'
import type {
  Conversation,
  Message,
  ProjectContext,
  RecallChunk,
  SendMessageInput,
  SendMessageResponse,
} from "@/types/chat"

export function sendMessage(
  input: SendMessageInput
): Promise<SendMessageResponse> {
  if (!input.project_id.trim()) throw new Error("project_id requerido")
  if (!input.content.trim()) throw new Error("content requerido")
  if (!input.provider.trim()) throw new Error("provider requerido")
  if (!input.model.trim()) throw new Error("model requerido")
  if (!input.endpoint.trim()) throw new Error("endpoint requerido")

  return invoke("send_message", { input })
}

export function deleteConversation(conversationId: string): Promise<void> {
  if (!conversationId.trim()) throw new Error("conversation_id requerido")
  return invoke("delete_conversation", { conversationId })
}

export function listConversations(projectId: string): Promise<Conversation[]> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invoke("list_conversations", { projectId })
}

export function listMessages(conversationId: string): Promise<Message[]> {
  if (!conversationId.trim()) throw new Error("conversation_id requerido")
  return invoke("list_messages", { conversationId })
}

export function getProjectContext(projectId: string): Promise<ProjectContext> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invoke("get_project_context", { projectId })
}

export function recallChunks(
  projectId: string,
  query: string,
  topK = 4
): Promise<RecallChunk[]> {
  return invoke("recall_chunks", {
    input: { project_id: projectId, query, top_k: topK },
  })
}
