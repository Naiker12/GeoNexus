import type {
  ConnectorConfig,
  ConnectorFile,
  RegisterLocalConnectorInput,
  SyncReport,
} from "@/types/connector"

/** Detecta si estamos dentro del runtime Tauri o en navegador (vite dev server) */
function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

/** Obtains invoke function safely, returning null if Tauri isn't available */
async function getInvoke() {
  if (!isTauriAvailable()) return null
  try {
    const { invoke } = await import("@tauri-apps/api/core")
    return invoke
  } catch {
    return null
  }
}

async function invokeOrFallback<T>(
  command: string,
  args: Record<string, unknown>,
  fallback: T
): Promise<T> {
  const invoke = await getInvoke()
  if (!invoke) return fallback
  try {
    return await invoke<T>(command, args)
  } catch (err) {
    console.error(`Tauri command ${command} failed:`, err)
    return fallback
  }
}

async function invokeRequired<T>(
  command: string,
  args: Record<string, unknown>
): Promise<T> {
  const invoke = await getInvoke()
  if (!invoke) throw new Error("Tauri not available")
  return invoke<T>(command, args)
}

export async function registerLocalConnector(
  input: RegisterLocalConnectorInput
): Promise<ConnectorConfig> {
  if (!input.project_id.trim()) throw new Error("project_id requerido")
  if (!input.display_name.trim()) throw new Error("display_name requerido")
  if (!input.root_path.trim()) throw new Error("root_path requerido")

  return invokeRequired("register_local_connector", { input })
}

export async function listConnectorFiles(connectorId: string): Promise<ConnectorFile[]> {
  if (!connectorId.trim()) throw new Error("connector_id requerido")

  return invokeOrFallback("list_connector_files", { connectorId: connectorId }, [])
}

export async function cacheConnectorFile(connectorId: string, fileId: string): Promise<ConnectorFile> {
  if (!connectorId.trim() || !fileId.trim()) {
    throw new Error("connector_id y file_id requeridos")
  }

  return invokeRequired("cache_connector_file", { connectorId: connectorId, fileId: fileId })
}

export async function syncLocalConnector(connectorId: string): Promise<SyncReport> {
  if (!connectorId.trim()) throw new Error("connector_id requerido")
  return invokeRequired("sync_local_connector", { connectorId: connectorId })
}

export async function listConnectorConfigs(projectId?: string): Promise<ConnectorConfig[]> {
  return invokeOrFallback("list_connector_configs", { projectId: projectId ?? "" }, [])
}
