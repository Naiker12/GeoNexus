import type {
  AnalysisMetrics,
  TokenBucket,
  ModelUsage,
  AnalysisRun,
  SkillUsage,
  CostSummary,
  TopQuery,
  Timeframe,
} from "@/types/analysis"

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

const DEFAULT_PROJECT_ID = "project-default"

// Create fallback values
const DEFAULT_ANALYSIS_METRICS: AnalysisMetrics = {
  tokens_hoy: 0,
  consultas_ia: 0,
  costo_estimado: 0,
  trazas_guardadas: 0,
}
const DEFAULT_COST_SUMMARY: CostSummary = {
  cost_hoy: 0,
  cost_7d: 0,
  cost_total: 0,
  avg_per_query: 0,
}

async function safeInvoke<T>(command: string, args: Record<string, unknown>, fallback: T): Promise<T> {
  try {
    const invoke = await getInvoke()
    if (!invoke) return fallback
    return await invoke<T>(command, args)
  } catch (e) {
    console.warn(`${command} no disponible:`, e)
    return fallback
  }
}

export async function getAnalysisMetrics(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<AnalysisMetrics> {
  return safeInvoke("get_analysis_metrics", { projectId }, DEFAULT_ANALYSIS_METRICS)
}

export async function getTokenTimeline(
  projectId: string = DEFAULT_PROJECT_ID,
  timeframe: Timeframe = "hoy"
): Promise<TokenBucket[]> {
  return safeInvoke("get_token_timeline", { projectId, timeframe }, [])
}

export async function getModelUsage(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<ModelUsage[]> {
  return safeInvoke("get_model_usage", { projectId }, [])
}

export async function listAnalysisRuns(
  projectId: string = DEFAULT_PROJECT_ID,
  limit: number = 50,
  offset: number = 0
): Promise<AnalysisRun[]> {
  return safeInvoke("list_analysis_runs", { projectId, limit, offset }, [])
}

export async function getSkillUsage(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<SkillUsage[]> {
  return safeInvoke("get_skill_usage", { projectId }, [])
}

export async function getCostByTimeframe(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<CostSummary> {
  return safeInvoke("get_cost_by_timeframe", { projectId }, DEFAULT_COST_SUMMARY)
}

export async function getTopQueries(
  projectId: string = DEFAULT_PROJECT_ID,
  limit: number = 5
): Promise<TopQuery[]> {
  return safeInvoke("get_top_queries", { projectId, limit }, [])
}

export async function exportAnalysisTraces(
  projectId: string = DEFAULT_PROJECT_ID,
  format: "csv" | "json" = "csv"
): Promise<string> {
  return safeInvoke("export_analysis_traces", { projectId, format }, "")
}
