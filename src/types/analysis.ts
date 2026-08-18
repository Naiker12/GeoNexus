export interface AnalysisMetrics {
  tokens_hoy: number
  consultas_ia: number
  costo_estimado: number
  trazas_guardadas: number
}

export interface TokenBucket {
  hora: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
}

export interface ModelUsage {
  model: string
  provider: string
  tokens: number
  requests: number
  input_tokens: number
  output_tokens: number
}

export interface AnalysisRun {
  id: string
  conversation_id: string
  title: string
  model: string
  tokens: number
  duration_ms: number
  trace_id: string | null
  tool_calls: number
  created_at: number
}

export interface SkillUsage {
  tool_name: string
  calls: number
  success_rate: number
}

export interface CostSummary {
  cost_hoy: number
  cost_7d: number
  cost_total: number
  avg_per_query: number
}

export interface TopQuery {
  title: string
  runs: number
  tokens: number
}

export type Timeframe = "hoy" | "7d" | "30d"
