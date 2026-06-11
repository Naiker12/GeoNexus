import type {
  ConnectorConfig,
  ConnectorFile,
  RegisterLocalConnectorInput,
  SyncReport,
} from "@/types/connector"
import { invoke } from "@tauri-apps/api/core"

async function invokeOrFallback<T>(
  command: string,
  args: Record<string, unknown>,
  fallback: T
): Promise<T> {
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

  return invokeOrFallback("list_connector_files", { connectorId: connectorId }, [])
}

export function cacheConnectorFile(connectorId: string, fileId: string): Promise<ConnectorFile> {
  if (!connectorId.trim() || !fileId.trim()) {
    throw new Error("connector_id y file_id requeridos")
  }

  return invokeRequired("cache_connector_file", { connectorId: connectorId, fileId: fileId })
}

export function syncLocalConnector(connectorId: string): Promise<SyncReport> {
  if (!connectorId.trim()) throw new Error("connector_id requerido")
  return invokeRequired("sync_local_connector", { connectorId: connectorId })
}

export function listConnectorConfigs(projectId?: string): Promise<ConnectorConfig[]> {
  return invokeOrFallback("list_connector_configs", { projectId: projectId ?? "" }, [])
}
