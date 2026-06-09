export type LlmProvider =
  | 'ollama'
  | 'lmstudio'
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'custom'

export interface LlmModelInfo {
  id: string
  name: string
  contextLength: number | null
  isFree: boolean | null
}

export interface ListLlmModelsInput {
  provider: LlmProvider | string
  endpoint: string
  apiKey?: string | null
}

export interface LlmProviderConfig {
  id: string
  provider: LlmProvider | string
  displayName: string
  endpoint: string
  selectedModel: string
  isActive: boolean
}
