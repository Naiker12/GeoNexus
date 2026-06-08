import type {
  ConnectorConfig,
  ConnectorFile,
  RegisterLocalConnectorInput,
  SyncReport,
} from "@/types/connector"

type InvokeFn = <T>(command: string, args?: Record<string, unknown>) => Promise<T>
type TauriWindow = Window & {
  __TAURI__?: {
    invoke?: InvokeFn
    tauri?: {
      invoke?: InvokeFn
    }
  }
}

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
  } catch (err) {
    console.error(`Tauri command ${command} failed:`, err)
    return fallback
  }
}

async function invokeRequired<T>(
  command: string,
  args: Record<string, unknown>
): Promise<T> {
  const invoke = getTauriInvoke()
  if (!invoke) throw new Error("Tauri no disponible")
  return invoke<T>(command, args)
}

export function registerLocalConnector(
  input: RegisterLocalConnectorInput
): Promise<ConnectorConfig> {
  if (!input.project_id.trim()) throw new Error("project_id requerido")
  if (!input.display_name.trim()) throw new Error("display_name requerido")
  if (!input.root_path.trim()) throw new Error("root_path requerido")

  return invokeRequired("register_local_connector", { input })
}

export function listConnectorFiles(connectorId: string): Promise<ConnectorFile[]> {
  if (!connectorId.trim()) throw new Error("connector_id requerido")

  return invokeOrFallback("list_connector_files", { connector_id: connectorId }, [])
}

export function cacheConnectorFile(connectorId: string, fileId: string): Promise<ConnectorFile> {
  if (!connectorId.trim() || !fileId.trim()) {
    throw new Error("connector_id y file_id requeridos")
  }

  return invokeRequired("cache_connector_file", { connector_id: connectorId, file_id: fileId })
}

export function syncLocalConnector(connectorId: string): Promise<SyncReport> {
  if (!connectorId.trim()) throw new Error("connector_id requerido")
  return invokeRequired("sync_local_connector", { connector_id: connectorId })
}
