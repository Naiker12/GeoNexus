/** MCP client tool wrapper (inspired by Hermes tools/). */

import { invoke } from "@tauri-apps/api/core"

export interface McpTool {
  serverId: string
  name: string
  description: string
  parameters: Record<string, unknown>
}

export async function listMcpTools(): Promise<McpTool[]> {
  return await invoke<McpTool[]>("list_mcp_tools")
}

export async function callMcpTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
  return await invoke("call_mcp_tool", { serverId, toolName, args })
}

export async function getMcpServerStatus(serverId: string): Promise<{ connected: boolean; error?: string }> {
  return await invoke("get_mcp_server_status", { serverId })
}
