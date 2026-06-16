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
  DataLineage,
  SearchGraphNodesResult,
} from "@/types/data"
import { defaultMetrics } from "@/features/workspace/data/data-data"
import { invoke } from "@tauri-apps/api/core"

export const DEFAULT_PROJECT_ID = "project-default"

/** Detecta si estamos dentro del runtime Tauri o en navegador (v2) */
export function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

async function invokeOrFallback<T>(
  command: string,
  args: Record<string, unknown>,
  fallback: T
): Promise<T> {
  if (!isTauriAvailable()) {
    console.debug(`[invokeOrFallback] Tauri no disponible, devolviendo fallback para ${command}`)
    return fallback
  }
  try {
    return await invoke<T>(command, args)
  } catch (e) {
    console.error(`[invokeOrFallback] Error en ${command}:`, e)
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
  return invokeOrFallback("list_data_assets", { projectId: projectId }, [])
}

export function getDataAsset(assetId: string): Promise<DataAsset | null> {
  if (!assetId.trim()) throw new Error("asset_id requerido")
  return invokeOrFallback("get_data_asset", { assetId: assetId }, null)
}

export function getDataStoreMetrics(
  projectId = DEFAULT_PROJECT_ID
): Promise<DataStoreMetrics> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback(
    "get_data_store_metrics",
    { projectId: projectId },
    defaultMetrics
  )
}

export function getSyncEvents(
  projectId = DEFAULT_PROJECT_ID,
  limit = 50,
  offset = 0
): Promise<SyncEvent[]> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback("get_sync_events", { projectId, limit, offset }, [])
}

export function deleteDataAsset(assetId: string): Promise<void> {
  if (!assetId.trim()) throw new Error("asset_id requerido")
  return invokeRequired<void>("delete_data_asset", { assetId: assetId })
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

  return invokeOrFallback("validate_data_asset", { assetId: assetId }, fallback)
}

export function indexDocument(documentId: string): Promise<number> {
  if (!documentId.trim()) throw new Error("document_id requerido")
  return invokeRequired<number>("index_document", { documentId: documentId })
}

export function listDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
  if (!documentId.trim()) throw new Error("document_id requerido")
  return invokeOrFallback<DocumentChunk[]>("list_document_chunks", { documentId: documentId }, [])
}

export async function listGraphNodes(projectId = DEFAULT_PROJECT_ID): Promise<GraphNode[]> {
  const nodes = await invokeOrFallback<BackendGraphNode[] | null>("list_graph_nodes", { projectId: projectId }, null)
  if (nodes) {
    return nodes.map((n, idx) => ({
      id: n.id ?? `fallback-node-${idx}-${Date.now()}`,
      project_id: n.project_id ?? projectId,
      workspace_id: n.workspace_id ?? null,
      label: n.name ?? "Nodo",
      type: (n.kind as any) ?? "concepto",
      description: n.description ?? "",
      evidence: n.evidence ?? "",
      x: n.x ?? 50,
      y: n.y ?? 50,
      weight: n.weight ?? 1,
      created_at: n.created_at ?? Date.now(),
      source_event: n.source_event ?? "",
      event_id: n.event_id ?? "",
      icon: n.icon ?? "",
      is_ephemeral: n.is_ephemeral ?? false,
      pinned: n.pinned ?? false,
      origin_kind: n.origin_kind ?? "document",
      source_asset_id: n.source_asset_id ?? null,
      source_chat_id: n.source_chat_id ?? null,
      use_count: n.use_count ?? 0,
      last_used_at: n.last_used_at ?? null,
      memory_score: n.memory_score ?? 1.0,
    }))
  }
  return []
}

export async function searchGraphNodes(
  projectId: string,
  query: string,
  kind?: string,
  limit?: number,
  offset?: number,
): Promise<SearchGraphNodesResult> {
  return invokeRequired<SearchGraphNodesResult>("search_graph_nodes", { projectId, query, kind, limit, offset })
}

export async function listGraphEdges(projectId = DEFAULT_PROJECT_ID): Promise<GraphEdge[]> {
    console.log("🔍 [listGraphEdges] Fetching edges for project:", projectId)
    const edges = await invokeOrFallback<BackendGraphEdge[] | null>("list_graph_edges", { projectId: projectId }, null)
    if (edges) {
        console.log("✅ [listGraphEdges] Got edges:", edges.length, edges)
        return edges.map((e, idx) => ({
            id: e.id ?? `edge-${idx}-${Date.now()}`, // Add fallback ID
            source: e.source ?? "unknown",
            target: e.target ?? "unknown",
            relation: e.relation ?? "related",
            strength: e.strength ?? 100
        }))
    }
    console.log("ℹ️ [listGraphEdges] No edges found, returning empty array")
    return []
}

export async function rebuildKnowledgeGraph(projectId = DEFAULT_PROJECT_ID): Promise<void> {
  await invokeOrFallback("rebuild_knowledge_graph", { projectId: projectId }, undefined)
}

export async function updateNodePosition(nodeId: string, x: number, y: number): Promise<void> {
  await invokeOrFallback("update_node_position", { nodeId, x, y }, undefined)
}

export async function clearEphemeralNodes(projectId = DEFAULT_PROJECT_ID): Promise<number> {
  return await invokeOrFallback("clear_ephemeral_nodes", { projectId }, 0)
}

export async function getRecentGraphEvents(
  projectId = DEFAULT_PROJECT_ID,
  sourceEvent?: string,
  limit?: number,
): Promise<BackendGraphNode[]> {
  return await invokeOrFallback("get_recent_graph_events", { projectId, sourceEvent: sourceEvent ?? null, limit: limit ?? null }, [])
}

export function getDataLineage(assetId: string): Promise<DataLineage> {
  if (!assetId.trim()) throw new Error("asset_id requerido")
  return invokeRequired<DataLineage>("get_data_lineage", { assetId })
}

export function reindexAsset(assetId: string): Promise<number> {
  if (!assetId.trim()) throw new Error("asset_id requerido")
  return invokeRequired<number>("reindex_asset", { assetId })
}

