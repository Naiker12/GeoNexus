import { invoke } from "@tauri-apps/api/core"
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

const DEFAULT_PROJECT_ID = "project-default"

export async function getAnalysisMetrics(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<AnalysisMetrics> {
  return invoke<AnalysisMetrics>("get_analysis_metrics", { projectId })
}

export async function getTokenTimeline(
  projectId: string = DEFAULT_PROJECT_ID,
  timeframe: Timeframe = "hoy"
): Promise<TokenBucket[]> {
  return invoke<TokenBucket[]>("get_token_timeline", { projectId, timeframe })
}

export async function getModelUsage(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<ModelUsage[]> {
  return invoke<ModelUsage[]>("get_model_usage", { projectId })
}

export async function listAnalysisRuns(
  projectId: string = DEFAULT_PROJECT_ID,
  limit: number = 50,
  offset: number = 0
): Promise<AnalysisRun[]> {
  return invoke<AnalysisRun[]>("list_analysis_runs", { projectId, limit, offset })
}

export async function getSkillUsage(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<SkillUsage[]> {
  return invoke<SkillUsage[]>("get_skill_usage", { projectId })
}

export async function getCostByTimeframe(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<CostSummary> {
  return invoke<CostSummary>("get_cost_by_timeframe", { projectId })
}

export async function getTopQueries(
  projectId: string = DEFAULT_PROJECT_ID,
  limit: number = 5
): Promise<TopQuery[]> {
  return invoke<TopQuery[]>("get_top_queries", { projectId, limit })
}

export async function exportAnalysisTraces(
  projectId: string = DEFAULT_PROJECT_ID,
  format: "csv" | "json" = "csv"
): Promise<string> {
  return invoke<string>("export_analysis_traces", { projectId, format })
}
