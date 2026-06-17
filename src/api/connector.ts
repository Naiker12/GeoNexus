import type { ConnectorConfig, ConnectorFile } from "@/types/connector"

/** Detecta si estamos dentro del runtime Tauri o en navegador (vite dev server) */
function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

/** Obtains invoke function safely, returning null if Tauri isn't available */
async function getInvoke(): Promise<typeof import('@tauri-apps/api/core').invoke | null> {
  if (!isTauriAvailable()) return null
  try {
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core')
    return tauriInvoke
  } catch (e) {
    console.error('[getInvoke] Could not import invoke:', e)
    return null
  }
}

export async function listConnectorConfigs(): Promise<ConnectorConfig[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  return invoke<ConnectorConfig[]>("list_connector_configs")
}

export async function listConnectorFiles(connectorId: string): Promise<ConnectorFile[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  return invoke<ConnectorFile[]>("list_connector_files", { connectorId })
}

export async function cacheConnectorFile(connectorId: string, fileId: string): Promise<string> {
  const invoke = await getInvoke()
  if (!invoke) return ""
  return invoke<string>("cache_connector_file", { connectorId, fileId })
}

export async function syncLocalConnector(connectorId: string, projectId: string): Promise<number> {
  const invoke = await getInvoke()
  if (!invoke) return 0
  return invoke<number>("sync_local_connector", { connectorId, projectId })
}

export async function registerLocalConnector(path: string, name: string): Promise<ConnectorConfig> {
  const invoke = await getInvoke()
  if (!invoke) throw new Error("Tauri no disponible")
  return invoke<ConnectorConfig>("register_local_connector", { path, name })
}

export async function uploadAssetFile(filePath: string, projectId: string): Promise<string> {
  const invoke = await getInvoke()
  if (!invoke) return ""
  return invoke<string>("upload_asset_file", { filePath, projectId })
}
