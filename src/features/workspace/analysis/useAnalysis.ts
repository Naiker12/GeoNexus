import { useState, useEffect, useCallback } from "react"
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
import {
  getAnalysisMetrics as apiMetrics,
  getTokenTimeline as apiTimeline,
  getModelUsage as apiModelUsage,
  listAnalysisRuns as apiRuns,
  getSkillUsage as apiSkills,
  getCostByTimeframe as apiCost,
  getTopQueries as apiTopQueries,
} from "@/api/analysis"

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[]): AsyncState<T> & { reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { load() }, [load])

  return { data, loading, error, reload: load }
}

export function useAnalysisMetrics(projectId: string = "project-default") {
  return useAsync(() => apiMetrics(projectId), [projectId])
}

export function useTokenTimeline(projectId: string = "project-default", timeframe: Timeframe = "hoy") {
  return useAsync(() => apiTimeline(projectId, timeframe), [projectId, timeframe])
}

export function useModelUsage(projectId: string = "project-default") {
  return useAsync(() => apiModelUsage(projectId), [projectId])
}

export function useAnalysisRuns(projectId: string = "project-default") {
  return useAsync(() => apiRuns(projectId), [projectId])
}

export function useSkillUsage(projectId: string = "project-default") {
  return useAsync(() => apiSkills(projectId), [projectId])
}

export function useCostByTimeframe(projectId: string = "project-default") {
  return useAsync<CostSummary>(() => apiCost(projectId), [projectId])
}

export function useTopQueries(projectId: string = "project-default", limit: number = 5) {
  return useAsync<TopQuery[]>(() => apiTopQueries(projectId, limit), [projectId, limit])
}
