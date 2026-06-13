export type AgentStatus = "idle" | "running" | "done" | "error"

export type AgentName =
  | "planner"
  | "discovery"
  | "knowledge"
  | "mcp"
  | "reasoning"
  | "result"

export interface AgentEvent {
  agent: AgentName
  status: AgentStatus
  message: string
  timestamp: number
  data?: unknown
}

export interface AgentPlan {
  goal: string
  needs: string[]
  sources: SourceRef[]
  steps: AgentStep[]
}

export interface SourceRef {
  type: "onedrive" | "filesystem" | "qgis" | "arcgis" | "memory" | "graph"
  path?: string
  query?: string
}

export interface AgentStep {
  agent: AgentName
  action: string
  status: AgentStatus
}

export interface DiscoveredAsset {
  id: string
  name: string
  type: "pdf" | "docx" | "shp" | "gpkg" | "geojson" | "tif" | "xlsx"
  source: SourceRef
  size?: number
  modified?: string
}

export interface KnowledgeChunk {
  id: string
  assetId: string
  content: string
  metadata: Record<string, unknown>
  embedding?: number[]
}

export type AgentSourceType =
  | "onedrive" | "filesystem" | "qgis" | "arcgis"
  | "memory" | "graph" | "github"
