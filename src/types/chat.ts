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

import type { SearchStep } from "@/components/chat/SearchingIndicator"

export type KnowledgeLookupStep = {
  source: "chromadb" | "graph" | "assets"
  label: string
  status: "searching" | "found" | "empty"
  count?: number
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
  chunk_references?: ChunkReference[]
  nodes_used: string[]
  tool_calls: unknown[]
  sources: string[]
  created_at: number
  isSearching?: boolean
  currentSearchQuery?: string
  research_sources?: ResearchSource[]
  searchElapsedSeconds?: number
  searchSteps?: SearchStep[]
  knowledgeSteps?: KnowledgeLookupStep[]
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
  mentioned_asset_ids?: string[]
  mentioned_connector_ids?: string[]
  mentioned_node_ids?: string[]
  mentioned_agent_sources?: string[]
  skill_names?: string[]
}

// ── Mentionable Sources (from Rust get_mentionable_sources) ──

export type ConnectorStatus = "connected" | "disconnected" | "error" | "syncing" | "mcp"

export interface MentionableSourceItem {
  id: string
  kind: string
  label: string
  sublabel: string
  icon: string
  color: string
  status: ConnectorStatus
  last_synced: number | null
  asset_count: number | null
  provider: string | null
}

export interface MentionableSourcesResponse {
  connectors: MentionableSourceItem[]
  assets: MentionableSourceItem[]
  graph_nodes: MentionableSourceItem[]
}

// ── Slash Commands ──

export type SlashCommandGroup = "Contexto" | "Chat" | "Modo" | "Sistema"

export type SlashCommandAction = () => void

export interface SlashCommand {
  id: string
  group: SlashCommandGroup
  label: string
  description: string
  icon: string
  shortcut: string | null
  action: SlashCommandAction
}

// ── Mention Sources ──

export type MentionKind = "connector" | "asset" | "graph_node" | "agent_source" | "skill"

export interface MentionSource {
  id: string
  kind: MentionKind
  label: string
  sublabel?: string
  icon: string
  color: string
  status?: ConnectorStatus
  contextPayload: {
    type: MentionKind
    id: string
  }
}

export type ChunkReference = {
  chunk_id: string
  asset_id: string
  asset_name: string
  chunk_index: number
  relevance_score: number
  text_preview: string
}

export type SessionSummary = {
  message_count: number
  skills_in_session: string[]
  assets_in_session: string[]
  last_topics: string[]
}

export type SendMessageResponse = {
  conversation_id: string
  message: Message
  chunks_used: ChunkReference[]
  trace_id: string
  research_sources?: ResearchSource[]
  search_query?: string
  validation_warnings?: string[]
  intent?: string
  session_summary?: SessionSummary
}

// ── Reasoning Events (from Rust reasoning:step) ──

export type ReasoningStep =
  | { type: "intent_classified"; intent: string; confidence: number; detected_entities: string[] }
  | { type: "knowledge_retrieved"; chunks_found: number; assets_queried: string[]; top_relevance: number }
  | { type: "web_searching"; query: string; sources_found: number }
  | { type: "skills_injected"; skill_names: string[]; total_tokens: number }
  | { type: "mcp_tool_called"; server_id: string; tool_name: string; success: boolean; duration_ms: number }
  | { type: "graph_context_loaded"; nodes_count: number; edges_count: number }
  | { type: "generating_response"; model: string; provider: string; estimated_tokens?: number }
  | { type: "response_complete"; total_duration_ms: number; input_tokens: number; output_tokens: number; steps_executed: string[] }

export interface ReasoningStepDisplay {
  id: string
  type: string
  label: string
  detail: string
  durationMs?: number
  status: "pending" | "running" | "done" | "skipped"
}

// ── Event Preview Streaming ─────────────────────────────────────

export type PreviewChunkType = "text" | "source" | "line" | "rag_doc"

export interface PreviewChunk {
  event_id: string
  chunk_type: PreviewChunkType
  content: string
  title?: string
  url?: string
  snippet?: string
  score?: number
  source?: string
}

export interface StreamEventBase {
  event_id: string
  conversation_id: string
  status: "searching" | "running" | "complete" | "error"
}

export interface DeepResearchStreamEvent extends StreamEventBase {
  type: "deep_research"
  display_query?: string
  sources_count?: number
  sources?: Array<{
    title: string
    url: string
    domain: string
    snippet: string
  }>
}

export interface ToolCallStreamEvent extends StreamEventBase {
  type: "tool_call"
  tool_name: string
  display_name: string
  subtitle?: string
  lines_read?: number
}

export interface KnowledgeLookupStreamEvent extends StreamEventBase {
  type: "knowledge_lookup"
  docs_count?: number
}

export interface GeneratingStreamEvent extends StreamEventBase {
  type: "generating"
}

export type AnyStreamEvent =
  | DeepResearchStreamEvent
  | ToolCallStreamEvent
  | KnowledgeLookupStreamEvent
  | GeneratingStreamEvent

export type SkillInfo = {
  id: string
  name: string
  category: string
  description?: string
}

export interface EventPreviewState {
  event_id: string
  chunks: PreviewChunk[]
  accumulated_text: string
}
