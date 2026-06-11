import { useAnalysisMetrics } from "@/features/workspace/analysis/useAnalysis"

export function AnalysisMetrics() {
  const { data, loading, error } = useAnalysisMetrics()

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="mt-2 h-7 w-16 rounded bg-muted" />
            <div className="mt-2 h-3 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  const items = error ? [
    { label: "Tokens hoy", value: "—", detail: "Error al cargar" },
    { label: "Consultas IA", value: "—", detail: "Error al cargar" },
    { label: "Costo estimado", value: "—", detail: "Error al cargar" },
    { label: "Trazas guardadas", value: "—", detail: "Error al cargar" },
  ] : [
    { label: "Tokens hoy", value: data ? formatTokens(data.tokens_hoy) : "0", detail: "Tokens totales del día" },
    { label: "Consultas IA", value: data ? String(data.consultas_ia) : "0", detail: "Respuestas del asistente hoy" },
    { label: "Costo estimado", value: data ? formatCost(data.costo_estimado) : "$0.00", detail: "Costo acumulado del día" },
    { label: "Trazas guardadas", value: data ? String(data.trazas_guardadas) : "0", detail: "Tool-calls registrados hoy" },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <MetricCard key={item.label} label={item.label} value={item.value} detail={item.detail} />
      ))}
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  )
}

function formatTokens(n: number): string {
  return new Intl.NumberFormat("es-CO").format(n)
}

function formatCost(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`
  if (n < 1) return `$${n.toFixed(2)}`
  return `$${n.toFixed(2)}`
}
