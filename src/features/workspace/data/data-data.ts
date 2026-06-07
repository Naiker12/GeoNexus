import type {
  AssetStatus,
  CacheState,
  DataAsset,
  DataStoreMetrics,
  SyncEvent,
  SyncEventType,
} from "@/types/data"

// ─── UI display helpers ──────────────────────────────────────────────────────

/** Mapea status interno → label UI en español */
export const statusLabel: Record<AssetStatus, string> = {
  pending: "Pendiente",
  indexing: "Sincronizando",
  ready: "Indexado",
  conflict: "Conflicto",
  error: "Error",
}

/** Mapea cache_state → label UI en español */
export const cacheLabel: Record<CacheState, string> = {
  none: "Sin cache",
  partial: "Cache parcial",
  cached: "Cache vigente",
  stale: "Cache obsoleto",
}

/** Mapea event_type → label UI en español */
export const eventTypeLabel: Record<SyncEventType, string> = {
  discovered: "Descubierto",
  downloaded: "Descargado",
  indexed: "Indexado",
  embedded: "Embebido",
  graph_linked: "Enlazado al grafo",
  conflict: "Conflicto",
  error: "Error",
}

/** Formatea bytes a string legible */
export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—"
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}

/** Formatea timestamp epoch a texto relativo simple */
export function formatRelativeTime(epochSecs: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - epochSecs
  if (diff < 60) return "Ahora"
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 2) return "Ayer"
  return `Hace ${Math.floor(diff / 86400)} días`
}

// ─── Seed data (fallback cuando no hay Tauri) ────────────────────────────────

const NOW = Math.floor(Date.now() / 1000)

export const dataAssets: DataAsset[] = [
  {
    id: "asset-pot-baq",
    project_id: "pot-barranquilla-2024",
    name: "POT Barranquilla 2024.pdf",
    kind: "document",
    source: "onedrive",
    location: "/GeoNexus/POT/documentos/POT_Barranquilla_2024.pdf",
    status: "ready",
    size_bytes: 44_136_857,
    chunks: 118,
    embeddings: 118,
    graph_nodes: 24,
    cache_state: "cached",
    created_at: NOW - 86400 * 7,
    updated_at: NOW - 3600,
  },
  {
    id: "asset-predios",
    project_id: "pot-barranquilla-2024",
    name: "predios_zona_norte.geojson",
    kind: "layer",
    source: "onedrive",
    location: "/GIS/capas/predios_zona_norte.geojson",
    status: "indexing",
    size_bytes: 19_293_798,
    chunks: 36,
    embeddings: 36,
    graph_nodes: 9,
    cache_state: "stale",
    created_at: NOW - 86400 * 3,
    updated_at: NOW - 720,
  },
  {
    id: "asset-cartografia",
    project_id: "pot-barranquilla-2024",
    name: "Anexos cartograficos.zip",
    kind: "shapefile",
    source: "local",
    location: "C:/GIS/Proyectos/POT/Anexos_cartograficos.zip",
    status: "ready",
    size_bytes: 90_177_536,
    chunks: 27,
    embeddings: 27,
    graph_nodes: 11,
    cache_state: "cached",
    created_at: NOW - 86400 * 14,
    updated_at: NOW - 86400,
  },
  {
    id: "asset-resolucion",
    project_id: "pot-barranquilla-2024",
    name: "Resolucion uso de suelo.docx",
    kind: "document",
    source: "sharepoint",
    location: "/Sites/Urbanismo/Normativa/Resolucion_uso_suelo.docx",
    status: "pending",
    size_bytes: 5_872_026,
    chunks: 0,
    embeddings: 0,
    graph_nodes: 0,
    cache_state: "none",
    created_at: NOW - 86400 * 2,
    updated_at: NOW - 86400,
  },
]

export const defaultMetrics: DataStoreMetrics = {
  project_id: "pot-barranquilla-2024",
  total_assets: 4,
  assets_ready: 2,
  assets_pending: 2,
  assets_error: 0,
  total_chunks: 181,
  total_embeddings: 181,
  total_graph_nodes: 44,
  cache_size_bytes: 159_480_217,
}

export const syncEvents: SyncEvent[] = [
  {
    id: "sync-1",
    project_id: "pot-barranquilla-2024",
    connector_id: "onedrive-main",
    asset_id: "asset-predios",
    event_type: "discovered",
    detail: "predios_zona_norte.geojson encontrado e indexado.",
    trace_id: "tr-001",
    created_at: NOW - 300,
  },
  {
    id: "sync-2",
    project_id: "pot-barranquilla-2024",
    connector_id: "sharepoint-urb",
    asset_id: "asset-resolucion",
    event_type: "error",
    detail: "Pendiente de OAuth para biblioteca Urbanismo.",
    trace_id: "tr-002",
    created_at: NOW - 240,
  },
  {
    id: "sync-3",
    project_id: "pot-barranquilla-2024",
    connector_id: null,
    asset_id: "asset-pot-baq",
    event_type: "indexed",
    detail: "2 archivos vigentes, 1 archivo en validación.",
    trace_id: "tr-003",
    created_at: NOW - 120,
  },
  {
    id: "sync-4",
    project_id: "pot-barranquilla-2024",
    connector_id: "mcp-router",
    asset_id: null,
    event_type: "error",
    detail: "Lectura bloqueada fuera de allowlist local.",
    trace_id: "tr-004",
    created_at: NOW - 60,
  },
]
