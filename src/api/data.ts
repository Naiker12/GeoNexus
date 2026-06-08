import type {
  AssetValidation,
  DataAsset,
  DataStoreMetrics,
  SyncEvent,
  DocumentChunk,
  GraphNode,
  GraphEdge,
  BackendGraphNode,
  BackendGraphEdge,
} from "@/types/data"
import { defaultMetrics } from "@/features/workspace/data/data-data"

type InvokeFn = <T>(command: string, args?: Record<string, unknown>) => Promise<T>
type TauriWindow = Window & {
  __TAURI__?: {
    invoke?: InvokeFn
    tauri?: {
      invoke?: InvokeFn
    }
  }
}

const DEFAULT_PROJECT_ID = "project-default"

function getTauriInvoke(): InvokeFn | null {
  const tauri = (window as TauriWindow).__TAURI__

  return tauri?.invoke ?? tauri?.tauri?.invoke ?? null
}

async function invokeOrFallback<T>(
  command: string,
  args: Record<string, unknown>,
  fallback: T
): Promise<T> {
  const invoke = getTauriInvoke()

  if (!invoke) return fallback

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
  const invoke = getTauriInvoke()

  if (!invoke) {
    throw new Error("Tauri no disponible")
  }

  return invoke<T>(command, args)
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

export async function listGraphNodes(projectId = DEFAULT_PROJECT_ID): Promise<GraphNode[]> {
  const nodes = await invokeOrFallback<BackendGraphNode[]>("list_graph_nodes", { project_id: projectId }, [])

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

export async function listGraphEdges(projectId = DEFAULT_PROJECT_ID): Promise<GraphEdge[]> {
  const edges = await invokeOrFallback<BackendGraphEdge[]>("list_graph_edges", { project_id: projectId }, [])

  return edges.map(e => ({
    source: e.source,
    target: e.target,
    relation: e.relation,
    strength: e.strength
  }))
}

export function rebuildKnowledgeGraph(projectId = DEFAULT_PROJECT_ID): Promise<void> {
  return invokeRequired<void>("rebuild_knowledge_graph", { project_id: projectId })
}
