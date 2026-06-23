import { invoke } from "@tauri-apps/api/core"

export interface HealthCheckResult {
  db_connected: boolean
  llm_configured: boolean
  has_allowed_paths: boolean
  bot_configured: boolean
  gateway_connected: boolean
}

export async function runHealthCheck(): Promise<HealthCheckResult> {
  return await invoke<HealthCheckResult>("run_health_check")
}
