import {
  dataAssets,
  dataStores,
  syncEvents,
  type DataAsset,
  type DataStoreMetric,
  type SyncEvent,
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
  return invokeOrFallback("list_data_assets", { projectId }, dataAssets)
}

export function getDataAsset(assetId: string): Promise<DataAsset | undefined> {
  return invokeOrFallback(
    "get_data_asset",
    { assetId },
    dataAssets.find((asset) => asset.id === assetId)
  )
}

export function getDataStoreMetrics(
  projectId = DEFAULT_PROJECT_ID
): Promise<DataStoreMetric[]> {
  return invokeOrFallback("get_data_store_metrics", { projectId }, dataStores)
}

export function getSyncEvents(projectId = DEFAULT_PROJECT_ID): Promise<SyncEvent[]> {
  return invokeOrFallback("get_sync_events", { projectId }, syncEvents)
}
