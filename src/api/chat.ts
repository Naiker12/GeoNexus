import type {
  Conversation,
  Message,
  SendMessageInput,
  SendMessageResponse,
} from "@/types/chat"

type InvokeFn = <T>(command: string, args?: Record<string, unknown>) => Promise<T>
type TauriWindow = Window & {
  __TAURI__?: {
    invoke?: InvokeFn
    tauri?: {
      invoke?: InvokeFn
    }
  }
}

function getTauriInvoke(): InvokeFn | null {
  const tauri = (window as TauriWindow).__TAURI__
  return tauri?.invoke ?? tauri?.tauri?.invoke ?? null
}

async function invokeRequired<T>(
  command: string,
  args: Record<string, unknown>
): Promise<T> {
  const invoke = getTauriInvoke()
  if (!invoke) throw new Error("Tauri no disponible")
  return invoke<T>(command, args)
}

export function sendMessage(
  input: SendMessageInput
): Promise<SendMessageResponse> {
  if (!input.project_id.trim()) throw new Error("project_id requerido")
  if (!input.content.trim()) throw new Error("content requerido")
  if (!input.provider.trim()) throw new Error("provider requerido")
  if (!input.model.trim()) throw new Error("model requerido")
  if (!input.endpoint.trim()) throw new Error("endpoint requerido")

  return invokeRequired("send_message", { input })
}

export function listConversations(projectId: string): Promise<Conversation[]> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeRequired("list_conversations", { project_id: projectId })
}

export function listMessages(conversationId: string): Promise<Message[]> {
  if (!conversationId.trim()) throw new Error("conversation_id requerido")
  return invokeRequired("list_messages", { conversation_id: conversationId })
}
