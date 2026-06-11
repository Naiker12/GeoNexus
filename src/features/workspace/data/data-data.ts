import type {
  AssetStatus,
  CacheState,
  DataAsset,
  DataStoreMetrics,
  SyncEvent,
  SyncEventType,
} from "@/types/data"

export const statusLabel: Record<AssetStatus, string> = {
  pending: "Pendiente",
  indexing: "Sincronizando",
  ready: "Indexado",
  conflict: "Conflicto",
  error: "Error",
}

export const cacheLabel: Record<CacheState, string> = {
  none: "Sin cache",
  partial: "Cache parcial",
  cached: "Cache vigente",
  stale: "Cache obsoleto",
}

export const eventTypeLabel: Record<SyncEventType, string> = {
  discovered: "Descubierto",
  downloaded: "Descargado",
  indexed: "Indexado",
  embedded: "Embebido",
  graph_linked: "Enlazado al grafo",
  conflict: "Conflicto",
  error: "Error",
  conversation_saved: "Conversacion guardada",
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "-"
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}

/** Si el timestamp está en milisegundos (> 1e12), pasa a segundos */
function toSeconds(ts: number): number {
  return ts > 1e12 ? Math.floor(ts / 1000) : ts
}

export function formatRelativeTime(epochSecs: number): string {
  if (!epochSecs) return "-"
  const secs = toSeconds(epochSecs)
  const now = Math.floor(Date.now() / 1000)
  const diff = now - secs
  if (diff < 60) return "Ahora"
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`
  if (diff < 86400 * 2) return "Ayer"
  return `Hace ${Math.floor(diff / 86400)} dias`
}

export const dataAssets: DataAsset[] = []

export const defaultMetrics: DataStoreMetrics = {
  project_id: "project-default",
  total_assets: 0,
  assets_ready: 0,
  assets_pending: 0,
  assets_error: 0,
  total_chunks: 0,
  total_embeddings: 0,
  total_graph_nodes: 0,
  cache_size_bytes: 0,
}

export const syncEvents: SyncEvent[] = []
