export type LlmProviderConfig = {
  provider_type: string
  name?: string
  model?: string
  endpoint: string
}

export type LlmPingResult = {
  status: "ok" | "error" | "needs-key"
  provider_type: string
  model?: string | null
  latency_ms?: number | null
  message?: string | null
}

export type LlmChatRequest = {
  provider_type: string
  model: string
  endpoint: string
  prompt: string
}

export type LlmChatResult = {
  status: "ok" | "error"
  provider_type: string
  model?: string | null
  text?: string | null
  message?: string | null
}

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
  if (!invoke) {
    throw new Error("Tauri no disponible")
  }
  return invoke<T>(command, args)
}

export function pingLlmProvider(
  config: LlmProviderConfig
): Promise<LlmPingResult> {
  return invokeRequired("ping_llm_provider", { config })
}

export function sendLlmMessage(
  request: LlmChatRequest
): Promise<LlmChatResult> {
  return invokeRequired("send_llm_message", { request })
}
