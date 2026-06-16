import type { LlmModelInfo, ListLlmModelsInput } from '../types/llm'

export type { LlmModelInfo, ListLlmModelsInput }

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

// ── Tipos legacy (para ping y chat que siguen usando sidecar Python) ─────────

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

// ── listLlmModels ─────────────────────────────────────────────────────────────

export async function listLlmModels(
  input: ListLlmModelsInput,
): Promise<LlmModelInfo[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  if (!input.provider.trim()) throw new Error('provider requerido')
  if (!input.endpoint.trim()) throw new Error('endpoint requerido')

  return invoke('list_llm_models', { input })
}

// ── pingLlmProvider ───────────────────────────────────────────────────────────

export async function pingLlmProvider(
  config: LlmProviderConfig
): Promise<LlmPingResult> {
  const invoke = await getInvoke()
  if (!invoke) return { status: "error", provider_type: config.provider_type, message: "Tauri not available" }
  return invoke('ping_llm_provider', { config })
}

// ── sendLlmMessage ────────────────────────────────────────────────────────────

export async function sendLlmMessage(
  request: LlmChatRequest
): Promise<LlmChatResult> {
  const invoke = await getInvoke()
  if (!invoke) return { status: "error", provider_type: request.provider_type, message: "Tauri not available" }
  return invoke('send_llm_message', { request })
}
