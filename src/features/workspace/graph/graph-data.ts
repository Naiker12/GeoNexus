export type GraphNodeType = "norma" | "documento" | "capa" | "zona" | "concepto"

export type GraphNode = {
  id: string
  label: string
  type: GraphNodeType
  description: string
  evidence: string
  x: number
  y: number
  weight: number
}

export type GraphEdge = {
  source: string
  target: string
  relation: string
  strength: number
}

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
