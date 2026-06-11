import type { GraphNodeType, GraphNode, GraphEdge, GraphUpdatePayload, BackendGraphNode, BackendGraphEdge } from "@/types/data"

export type { GraphNodeType, GraphNode, GraphEdge, GraphUpdatePayload, BackendGraphNode, BackendGraphEdge }

export type GraphCluster = {
  name: string
  count: number
  confidence: string
  summary: string
}

export type GraphInsight = {
  title: string
  detail: string
  impact: "Alta" | "Media" | "Baja"
}

export type GraphTrace = {
  step: string
  status: "Completo" | "En curso" | "Pendiente"
  detail: string
}

export const graphNodes: GraphNode[] = []
export const graphEdges: GraphEdge[] = []
export const graphClusters: GraphCluster[] = []
export const graphInsights: GraphInsight[] = []
export const graphTrace: GraphTrace[] = []
