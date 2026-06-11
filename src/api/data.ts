import type {
  AssetValidation,
  DataAsset,
  DataStoreMetrics,
  SyncEvent,
  DocumentChunk,
  GraphNode,
  GraphNodeType,
  GraphEdge,
  BackendGraphNode,
  BackendGraphEdge,
} from "@/types/data"
import { defaultMetrics } from "@/features/workspace/data/data-data"
import { invoke } from "@tauri-apps/api/core"

const DEFAULT_PROJECT_ID = "project-default"

async function invokeOrFallback<T>(
  command: string,
  args: Record<string, unknown>,
  fallback: T
): Promise<T> {
  try {
    return await invoke<T>(command, args)
  } catch {
    return fallback
  }
}

async function invokeRequired<T>(
  command: string,
  args: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(command, args)
  } catch (e) {
    throw new Error(`Error al ejecutar ${command}: ${e}`)
  }
}

export function listDataAssets(
  projectId = DEFAULT_PROJECT_ID
): Promise<DataAsset[]> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback("list_data_assets", { project_id: projectId }, [])
}

export function getDataAsset(assetId: string): Promise<DataAsset | null> {
  if (!assetId.trim()) throw new Error("asset_id requerido")
  return invokeOrFallback("get_data_asset", { asset_id: assetId }, null)
}

export function getDataStoreMetrics(
  projectId = DEFAULT_PROJECT_ID
): Promise<DataStoreMetrics> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback(
    "get_data_store_metrics",
    { project_id: projectId },
    defaultMetrics
  )
}

export function getSyncEvents(
  projectId = DEFAULT_PROJECT_ID,
  limit = 50
): Promise<SyncEvent[]> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback("get_sync_events", { project_id: projectId, limit }, [])
}

export function validateDataAsset(assetId: string): Promise<AssetValidation> {
  if (!assetId.trim()) throw new Error("asset_id requerido")

  // Fallback local cuando no hay Tauri
  const fallback: AssetValidation = {
    asset_id: assetId,
    file_exists: false,
    path_allowed: false,
    metadata_ok: false,
    cache_valid: false,
    chunks_exist: false,
    is_ready: false,
    issues: ["Tauri no disponible — validación solo en app nativa"],
  }

  return invokeOrFallback("validate_data_asset", { asset_id: assetId }, fallback)
}

export function indexDocument(documentId: string): Promise<number> {
  if (!documentId.trim()) throw new Error("document_id requerido")
  return invokeRequired<number>("index_document", { document_id: documentId })
}

export function listDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
  if (!documentId.trim()) throw new Error("document_id requerido")
  return invokeOrFallback<DocumentChunk[]>("list_document_chunks", { document_id: documentId }, [])
}

const fallbackNodes: GraphNode[] = [
  { id: "node-norma-1", project_id: "project-default", workspace_id: "workspace-main", label: "Artículo 45 - Usos del suelo", type: "norma" as GraphNodeType, description: "Clasificación de usos del suelo: residencial, comercial, industrial. Artículo 45 del POT.", evidence: "POT Municipal 2024", x: 10, y: 10, weight: 3, created_at: 0 },
  { id: "node-norma-2", project_id: "project-default", workspace_id: "workspace-main", label: "Artículo 78 - Alturas máximas", type: "norma" as GraphNodeType, description: "Alturas máximas permitidas por zona: Z1=3 pisos, Z2=5 pisos, Z3=8 pisos.", evidence: "POT Municipal 2024", x: 30, y: 15, weight: 2, created_at: 0 },
  { id: "node-zona-1", project_id: "project-default", workspace_id: "workspace-main", label: "Zona Residencial Z1", type: "zona" as GraphNodeType, description: "Zona de baja densidad: máximo 3 pisos, uso residencial exclusivo.", evidence: "POT Municipal 2024", x: 15, y: 30, weight: 2, created_at: 0 },
  { id: "node-zona-2", project_id: "project-default", workspace_id: "workspace-main", label: "Zona Comercial Z2", type: "zona" as GraphNodeType, description: "Zona mixta comercial-residencial: máximo 5 pisos.", evidence: "POT Municipal 2024", x: 35, y: 35, weight: 2, created_at: 0 },
  { id: "node-concepto-1", project_id: "project-default", workspace_id: "workspace-main", label: "Suelo urbano", type: "concepto" as GraphNodeType, description: "Suelo dentro del perímetro urbano con servicios públicos domiciliarios.", evidence: "Ley 388 de 1997", x: 50, y: 20, weight: 1, created_at: 0 },
  { id: "node-concepto-2", project_id: "project-default", workspace_id: "workspace-main", label: "Cesión urbanística", type: "concepto" as GraphNodeType, description: "Porcentaje de suelo que debe cederse al municipio para espacio público.", evidence: "POT Municipal 2024", x: 55, y: 40, weight: 1, created_at: 0 },
  { id: "node-capa-1", project_id: "project-default", workspace_id: "workspace-main", label: "Capa de estratificación", type: "capa" as GraphNodeType, description: "Estratificación socioeconómica por manzanas catastrales.", evidence: "DANE - Estratificación", x: 70, y: 25, weight: 1, created_at: 0 },
]

const fallbackEdges: GraphEdge[] = [
  { source: "node-norma-1", target: "node-zona-1", relation: "regula", strength: 70 },
  { source: "node-norma-1", target: "node-zona-2", relation: "regula", strength: 70 },
  { source: "node-norma-2", target: "node-zona-1", relation: "restringe", strength: 70 },
  { source: "node-norma-2", target: "node-zona-2", relation: "restringe", strength: 70 },
  { source: "node-zona-1", target: "node-concepto-1", relation: "clasifica", strength: 70 },
  { source: "node-concepto-2", target: "node-zona-2", relation: "aplica", strength: 70 },
  { source: "node-capa-1", target: "node-zona-1", relation: "interseca", strength: 70 },
  { source: "node-capa-1", target: "node-zona-2", relation: "interseca", strength: 70 },
]

export async function listGraphNodes(projectId = DEFAULT_PROJECT_ID): Promise<GraphNode[]> {
  const nodes = await invokeOrFallback<BackendGraphNode[] | null>("list_graph_nodes", { project_id: projectId }, null)
  if (nodes) {
    return nodes.map(n => ({
      id: n.id,
      project_id: n.project_id,
      workspace_id: n.workspace_id,
      label: n.name,
      type: n.kind as any,
      description: n.description,
      evidence: n.evidence,
      x: n.x,
      y: n.y,
      weight: n.weight,
      created_at: n.created_at
    }))
  }
  return fallbackNodes
}

export async function listGraphEdges(projectId = DEFAULT_PROJECT_ID): Promise<GraphEdge[]> {
  const edges = await invokeOrFallback<BackendGraphEdge[] | null>("list_graph_edges", { project_id: projectId }, null)
  if (edges) {
    return edges.map(e => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
      strength: e.strength
    }))
  }
  return fallbackEdges
}

export async function rebuildKnowledgeGraph(projectId = DEFAULT_PROJECT_ID): Promise<void> {
  await invokeOrFallback("rebuild_knowledge_graph", { project_id: projectId }, undefined)
}

export async function updateNodePosition(nodeId: string, x: number, y: number): Promise<void> {
  await invokeOrFallback("update_node_position", { nodeId, x, y }, undefined)
}
