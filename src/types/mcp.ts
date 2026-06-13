export type McpStatus = "online" | "offline" | "pending" | "degraded"

export type ToolStatus = "ready" | "guarded" | "planned"

export interface McpServer {
  id: string
  name: string
  url: string
  status: McpStatus
  auth_type?: string
  auth_ref?: string
  latency_ms?: number
  error_count: number
  last_ping_at?: string
  tools?: McpTool[]
  description?: string
}

export interface McpTool {
  id: string
  server_id: string
  name: string
  description?: string
  args_schema?: Record<string, unknown>
  return_type?: string
  status: ToolStatus
  category?: string
  args?: string
  result?: string
}

export interface RegisterServerPayload {
  id: string
  name: string
  url: string
  auth_type?: string
  auth_ref?: string
  tools?: string[]
}

export interface CallToolPayload {
  server_id: string
  tool: string
  args: Record<string, unknown>
  trace_id: string
  agent_name?: string
}

export interface CallToolResult {
  success: boolean
  data?: unknown
  error?: string
  duration_ms: number
}

export interface PingResult {
  online: boolean
  latency_ms?: number
  error?: string
}

export interface AllowlistRule {
  id: string
  server_id: string
  tool_name: string
  allowed: boolean
  rate_limit?: number
}

export interface UpsertAllowlistPayload {
  server_id: string
  tool_name?: string
  allowed: boolean
  rate_limit?: number
}
