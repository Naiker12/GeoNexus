import { invoke } from '@tauri-apps/api/core'
import type { LlmModelInfo, ListLlmModelsInput } from '../types/llm'

export type { LlmModelInfo, ListLlmModelsInput }

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
  if (!input.provider.trim()) throw new Error('provider requerido')
  if (!input.endpoint.trim()) throw new Error('endpoint requerido')

  return invoke('list_llm_models', { input })
}

// ── pingLlmProvider ───────────────────────────────────────────────────────────

export function pingLlmProvider(
  config: LlmProviderConfig
): Promise<LlmPingResult> {
  return invoke('ping_llm_provider', { config })
}

// ── sendLlmMessage ────────────────────────────────────────────────────────────

export function sendLlmMessage(
  request: LlmChatRequest
): Promise<LlmChatResult> {
  return invoke('send_llm_message', { request })
}
