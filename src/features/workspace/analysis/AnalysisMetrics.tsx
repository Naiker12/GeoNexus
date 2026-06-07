import { analysisSummary } from "@/features/workspace/analysis/analysis-data"

export function AnalysisMetrics() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {analysisSummary.map((item) => (
        <MetricCard key={item.label} {...item} />
      ))}
    </div>
  )
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <article className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  )
}
