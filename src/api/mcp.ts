import type { McpServer, McpTool, RegisterServerPayload, CallToolPayload, CallToolResult, PingResult, ImportResult, AllowlistRule, UpsertAllowlistPayload } from "@/types/mcp"

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

async function invokeOrFallback<T>(
  command: string,
  args: Record<string, unknown>,
  fallback: T
): Promise<T> {
  const invoke = await getInvoke()
  if (!invoke) {
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
  const invoke = await getInvoke()
  if (!invoke) {
    throw new Error(`No se puede ejecutar ${command} fuera del runtime Tauri`)
  }
  try {
    return await invoke<T>(command, args)
  } catch (e) {
    throw new Error(`Error al ejecutar ${command}: ${e}`)
  }
}

export function listMcpServers(): Promise<McpServer[]> {
  return invokeOrFallback("list_mcp_servers", {}, [])
}

export function registerMcpServer(payload: RegisterServerPayload): Promise<McpServer> {
  if (!payload.id.trim()) throw new Error("ID requerido")
  if (!payload.name.trim()) throw new Error("Nombre requerido")
  const isHttp = payload.transport !== "stdio"
  if (isHttp && !payload.url.trim()) throw new Error("URL requerido para servidores HTTP")
  return invokeRequired("register_mcp_server", { payload })
}

export function pingMcpServer(serverId: string): Promise<PingResult> {
  if (!serverId.trim()) throw new Error("server_id requerido")
  return invokeOrFallback("ping_mcp_server", { serverId }, { online: false, latencyMs: null, error: "Tauri not available" })
}

export function pingMcpUrl(url: string): Promise<PingResult> {
  if (!url.trim()) throw new Error("URL requerida")
  return invokeOrFallback("ping_mcp_server_url", { url }, { online: false, latencyMs: null, error: "Tauri not available" })
}

export function listMcpTools(serverId: string): Promise<McpTool[]> {
  return invokeOrFallback("list_mcp_tools", { serverId }, [])
}

export function callMcpTool(payload: CallToolPayload): Promise<CallToolResult> {
  return invokeRequired("call_mcp_tool", { payload })
}

export function listMcpAllowlist(serverId: string): Promise<AllowlistRule[]> {
  if (!serverId.trim()) throw new Error("server_id requerido")
  return invokeOrFallback("list_mcp_allowlist", { serverId }, [])
}

export function upsertMcpAllowlist(payload: UpsertAllowlistPayload): Promise<AllowlistRule> {
  if (!payload.server_id.trim()) throw new Error("server_id requerido")
  return invokeRequired("upsert_mcp_allowlist", { payload })
}

export function deleteMcpAllowlist(ruleId: string): Promise<void> {
  if (!ruleId.trim()) throw new Error("rule_id requerido")
  return invokeOrFallback("delete_mcp_allowlist", { ruleId }, undefined)
}

export function deleteMcpServer(serverId: string): Promise<void> {
  if (!serverId.trim()) throw new Error("server_id requerido")
  return invokeOrFallback("delete_mcp_server", { serverId }, undefined)
}

export function importMcpConfig(configJson: string): Promise<ImportResult> {
  if (!configJson.trim()) throw new Error("config json requerido")
  return invokeRequired("import_mcp_config", { configJson })
}

export function exportMcpConfig(): Promise<string> {
  return invokeOrFallback("export_mcp_config", {}, "")
}

export function discoverMcpTools(serverId: string): Promise<number> {
  if (!serverId.trim()) throw new Error("server_id requerido")
  return invokeRequired("discover_mcp_tools", { serverId })
}

export interface PreviewTool {
  name: string
  description: string
}

export function previewMcpTools(params: {
  url?: string
  command?: string
  args?: string[]
  auth_token?: string
}): Promise<PreviewTool[]> {
  return invokeOrFallback("preview_mcp_tools", params, [])
}
