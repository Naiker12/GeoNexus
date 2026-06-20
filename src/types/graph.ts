export type GraphNodeKind =
  | "entity" | "concept" | "file" | "agent"
  | "norma" | "documento" | "capa" | "zona"
  | "chat_turn" | "web_search" | "upload" | "connector" | "rag_recall"

export interface GraphNode {
  id: string
  project_id: string
  workspace_id: string | null
  label: string
  kind: GraphNodeKind
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
  pinned: boolean
  origin_kind: string
  source_asset_id: string | null
  source_chat_id: string | null
  use_count: number
  last_used_at: string | null
  memory_score: number
}

export interface GraphEdge {
  id: string
  project_id: string
  source: string
  target: string
  relation: string
  strength: number
  created_at: number
}

export interface GraphUpdatePayload {
  source_event: "chat" | "upload" | "sync" | "rag"
  event_id: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  timestamp: number
}

export interface SearchGraphNodesResult {
  total: number
  nodes: GraphNode[]
}
