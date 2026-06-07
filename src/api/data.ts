import type {
  AssetValidation,
  DataAsset,
  DataStoreMetrics,
  SyncEvent,
} from "@/types/data"
import {
  dataAssets,
  defaultMetrics,
  syncEvents,
} from "@/features/workspace/data/data-data"

type InvokeFn = <T>(command: string, args?: Record<string, unknown>) => Promise<T>
type TauriWindow = Window & {
  __TAURI__?: {
    invoke?: InvokeFn
    tauri?: {
      invoke?: InvokeFn
    }
  }
}

const DEFAULT_PROJECT_ID = "pot-barranquilla-2024"

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

export function listDataAssets(
  projectId = DEFAULT_PROJECT_ID
): Promise<DataAsset[]> {
  if (!projectId.trim()) throw new Error("project_id requerido")
  return invokeOrFallback("list_data_assets", { project_id: projectId }, dataAssets)
}

export function getDataAsset(assetId: string): Promise<DataAsset | null> {
  if (!assetId.trim()) throw new Error("asset_id requerido")
  return invokeOrFallback(
    "get_data_asset",
    { asset_id: assetId },
    dataAssets.find((a) => a.id === assetId) ?? null
  )
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
  return invokeOrFallback(
    "get_sync_events",
    { project_id: projectId, limit },
    syncEvents
  )
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
