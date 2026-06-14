// ─── Enums (union types) ─────────────────────────────────────────────────────

export type AssetStatus = "pending" | "indexing" | "ready" | "conflict" | "error"
export type CacheState = "none" | "partial" | "cached" | "stale"
export type AssetKind =
  | "document"
  | "layer"
  | "shapefile"
  | "csv"
  | "raster"
  | "word"
  | "excel"
  | "output"
  | "other"
export type SyncEventType =
  | "discovered"
  | "downloaded"
  | "indexed"
  | "embedded"
  | "graph_linked"
  | "conflict"
  | "error"
  | "conversation_saved"

// ─── Domain structs ──────────────────────────────────────────────────────────

export interface DataAsset {
  id: string
  project_id: string
  workspace_id: string | null
  name: string
  kind: AssetKind
  source: string
  location: string
  agent_id: string | null
  connector_id: string | null
  status: AssetStatus
  size_bytes: number | null
  chunks: number
  embeddings: number
  graph_nodes: number
  cache_state: CacheState
  trace_id: string | null
  created_at: number
  updated_at: number
}

export interface DataStoreMetrics {
  project_id: string
  total_assets: number
  assets_ready: number
  assets_pending: number
  assets_error: number
  total_chunks: number
  total_embeddings: number
  total_graph_nodes: number
  cache_size_bytes: number
}

export interface SyncEvent {
  id: string
  project_id: string
  workspace_id: string | null
  connector_id: string | null
  asset_id: string | null
  agent_id: string | null
  event_type: SyncEventType
  detail: string | null
  trace_id: string | null
  created_at: number
}

export interface AssetValidation {
  asset_id: string
  file_exists: boolean
  path_allowed: boolean
  metadata_ok: boolean
  cache_valid: boolean
  chunks_exist: boolean
  is_ready: boolean
  issues: string[]
}

export interface DocumentChunk {
  id: string
  asset_id: string
  chunk_index: number
  content: string
  token_count: number
  page_number: number | null
  created_at: number
}

export type GraphNodeType = "norma" | "documento" | "capa" | "zona" | "concepto" | "chat_turn" | "web_search" | "upload" | "connector" | "rag_recall"

export interface BackendGraphNode {
  id: string
  project_id: string
  workspace_id: string | null
  name: string
  kind: string
  description: string
  evidence: string
  x: number
  y: number
  weight: number
  created_at: number
  source_event: string
  event_id: string
  icon: string
  is_ephemeral: boolean
}

export interface GraphNode {
  id: string
  project_id: string
  workspace_id: string | null
  label: string
  type: GraphNodeType
  description: string
  evidence: string
  x: number
  y: number
  weight: number
  created_at: number
  source_event: string
  event_id: string
  icon: string
  is_ephemeral: boolean
}

export interface SearchGraphNodesResult {
  total: number
  nodes: BackendGraphNode[]
}

export interface GraphUpdatePayload {
  source_event: "chat" | "upload" | "sync" | "rag"
  event_id: string
  nodes: BackendGraphNode[]
  edges: BackendGraphEdge[]
  timestamp: number
}

export interface BackendGraphEdge {
  id: string
  project_id: string
  source: string
  target: string
  relation: string
  strength: number
  created_at: number
}

export interface GraphEdge {
  source: string
  target: string
  relation: string
  strength: number
}

export interface LineageStep {
  step: string
  status: string
  detail: string
  timestamp: number | null
}

export interface DataLineage {
  asset_id: string
  asset_name: string
  source: string
  kind: string
  steps: LineageStep[]
}
