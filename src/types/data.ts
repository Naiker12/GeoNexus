// ─── Enums (union types) ─────────────────────────────────────────────────────

export type AssetStatus = "pending" | "indexing" | "ready" | "conflict" | "error"
export type CacheState = "none" | "partial" | "cached" | "stale"
export type AssetKind = "document" | "layer" | "shapefile" | "csv" | "raster" | "other"
export type SyncEventType =
  | "discovered"
  | "downloaded"
  | "indexed"
  | "embedded"
  | "graph_linked"
  | "conflict"
  | "error"

// ─── Domain structs ──────────────────────────────────────────────────────────

export interface DataAsset {
  id: string
  project_id: string
  name: string
  kind: AssetKind
  source: string
  location: string
  status: AssetStatus
  size_bytes: number | null
  chunks: number
  embeddings: number
  graph_nodes: number
  cache_state: CacheState
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
  connector_id: string | null
  asset_id: string | null
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
