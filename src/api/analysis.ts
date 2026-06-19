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

export async function getAnalysisMetrics(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<AnalysisMetrics> {
  const invoke = await getInvoke()
  if (!invoke) return DEFAULT_ANALYSIS_METRICS
  return invoke<AnalysisMetrics>("get_analysis_metrics", { projectId })
}

export async function getTokenTimeline(
  projectId: string = DEFAULT_PROJECT_ID,
  timeframe: Timeframe = "hoy"
): Promise<TokenBucket[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  return invoke<TokenBucket[]>("get_token_timeline", { projectId, timeframe })
}

export async function getModelUsage(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<ModelUsage[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  return invoke<ModelUsage[]>("get_model_usage", { projectId })
}

export async function listAnalysisRuns(
  projectId: string = DEFAULT_PROJECT_ID,
  limit: number = 50,
  offset: number = 0
): Promise<AnalysisRun[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  return invoke<AnalysisRun[]>("list_analysis_runs", { projectId, limit, offset })
}

export async function getSkillUsage(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<SkillUsage[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  return invoke<SkillUsage[]>("get_skill_usage", { projectId })
}

export async function getCostByTimeframe(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<CostSummary> {
  const invoke = await getInvoke()
  if (!invoke) return DEFAULT_COST_SUMMARY
  return invoke<CostSummary>("get_cost_by_timeframe", { projectId })
}

export async function getTopQueries(
  projectId: string = DEFAULT_PROJECT_ID,
  limit: number = 5
): Promise<TopQuery[]> {
  const invoke = await getInvoke()
  if (!invoke) return []
  return invoke<TopQuery[]>("get_top_queries", { projectId, limit })
}

export async function exportAnalysisTraces(
  projectId: string = DEFAULT_PROJECT_ID,
  format: "csv" | "json" = "csv"
): Promise<string> {
  const invoke = await getInvoke()
  if (!invoke) return ""
  return invoke<string>("export_analysis_traces", { projectId, format })
}
