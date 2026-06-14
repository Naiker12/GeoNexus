export type McpStatus = "online" | "offline" | "pending" | "degraded"

export type McpTransport = "http" | "stdio" | "sse"

export type ToolStatus = "ready" | "guarded" | "planned"

export interface McpServer {
  id: string
  name: string
  url: string
  status: McpStatus
  transport: McpTransport
  auth_type?: string
  auth_ref?: string
  auth_token?: string
  command?: string
  args?: string[]
  env?: Record<string, string>
  headers?: Record<string, string>
  disabled: boolean
  auto_approve?: string[]
  timeout_ms?: number
  latency_ms?: number
  error_count: number
  description?: string
  tools_count?: number
  protocol_version?: string
  last_error?: string
  last_ping_at?: string
  tools?: McpTool[]
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
  transport?: string
  auth_type?: string
  auth_ref?: string
  auth_token?: string
  command?: string
  args?: string[]
  env?: Record<string, string>
  headers?: Record<string, string>
  disabled?: boolean
  auto_approve?: string[]
  timeout_ms?: number
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
  protocol_version?: string
  tools_count?: number
  server_name?: string
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
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
