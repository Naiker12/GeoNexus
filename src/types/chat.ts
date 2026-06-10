export type MessageRole = "user" | "assistant" | "tool" | "system"

export type ResearchSource = {
  url: string
  title: string
  snippet?: string
  status: "loading" | "done"
}

export type Conversation = {
  id: string
  project_id: string
  workspace_id: string | null
  title: string | null
  provider: string
  model: string
  created_at: number
  updated_at: number
  message_count: number | null
}

export type MessageStats = {
  input_tokens: number
  output_tokens: number
  total_tokens: number
  duration_ms: number
  tokens_per_second: number
  cost_usd: number
  context_window: number
  context_used_pct: number
}

export type Message = {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  provider: string | null
  model: string | null
  trace_id: string
  chunks_used: string[]
  nodes_used: string[]
  tool_calls: unknown[]
  sources: string[]
  created_at: number
  isSearching?: boolean
  currentSearchQuery?: string
  research_sources?: ResearchSource[]
  searchElapsedSeconds?: number
  stats?: MessageStats
}

export type RecallChunk = {
  text: string
  source: string
  asset_id: string
  score: number
}

export type ContextAsset = {
  name: string
  kind: string
  status: string
}

export type ContextNode = {
  label: string
  kind: string
}

export type ProjectContext = {
  assets: ContextAsset[]
  graph_nodes: ContextNode[]
}

export type SendMessageInput = {
  project_id: string
  workspace_id?: string | null
  conversation_id?: string | null
  content: string
  provider: string
  model: string
  endpoint: string
  api_key?: string | null
  use_context: boolean
  max_context_chunks?: number | null
  web_search?: boolean
}

export type ChunkReference = {
  chunk_id: string
  asset_id: string
  asset_name: string
  chunk_index: number
  relevance_score: number
  text_preview: string
}

export type SendMessageResponse = {
  conversation_id: string
  message: Message
  chunks_used: ChunkReference[]
  trace_id: string
  research_sources?: ResearchSource[]
  search_query?: string
}
