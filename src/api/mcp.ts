import { invoke } from "@tauri-apps/api/core"
import type { McpServer, McpTool, RegisterServerPayload, CallToolPayload, CallToolResult, PingResult, ImportResult, AllowlistRule, UpsertAllowlistPayload } from "@/types/mcp"

async function invokeRequired<T>(command: string, args: Record<string, unknown>): Promise<T> {
  return invoke<T>(command, args)
}

export function listMcpServers(): Promise<McpServer[]> {
  return invokeRequired("list_mcp_servers", {})
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
  return invokeRequired("ping_mcp_server", { serverId })
}

export function pingMcpUrl(url: string): Promise<PingResult> {
  if (!url.trim()) throw new Error("URL requerida")
  return invokeRequired("ping_mcp_server_url", { url })
}

export function listMcpTools(serverId: string): Promise<McpTool[]> {
  return invokeRequired("list_mcp_tools", { serverId })
}

export function callMcpTool(payload: CallToolPayload): Promise<CallToolResult> {
  return invokeRequired("call_mcp_tool", { payload })
}

export function listMcpAllowlist(serverId: string): Promise<AllowlistRule[]> {
  if (!serverId.trim()) throw new Error("server_id requerido")
  return invokeRequired("list_mcp_allowlist", { serverId })
}

export function upsertMcpAllowlist(payload: UpsertAllowlistPayload): Promise<AllowlistRule> {
  if (!payload.server_id.trim()) throw new Error("server_id requerido")
  return invokeRequired("upsert_mcp_allowlist", { payload })
}

export function deleteMcpAllowlist(ruleId: string): Promise<void> {
  if (!ruleId.trim()) throw new Error("rule_id requerido")
  return invokeRequired("delete_mcp_allowlist", { ruleId })
}

export function deleteMcpServer(serverId: string): Promise<void> {
  if (!serverId.trim()) throw new Error("server_id requerido")
  return invokeRequired("delete_mcp_server", { serverId })
}

export function importMcpConfig(configJson: string): Promise<ImportResult> {
  if (!configJson.trim()) throw new Error("config json requerido")
  return invokeRequired("import_mcp_config", { configJson })
}

export function exportMcpConfig(): Promise<string> {
  return invokeRequired("export_mcp_config", {})
}

export function discoverStdioTools(serverId: string): Promise<number> {
  if (!serverId.trim()) throw new Error("server_id requerido")
  return invokeRequired("discover_stdio_tools", { serverId })
}
