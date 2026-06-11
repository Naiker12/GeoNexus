import { useCostByTimeframe } from "@/features/workspace/analysis/useAnalysis"

function formatCost(cost: number): string {
  if (cost >= 0.01) return `$${cost.toFixed(3)}`
  if (cost >= 0.001) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(6)}`
}

export function CostSummaryBar() {
  const { data, loading } = useCostByTimeframe()

  if (loading) {
    return (
      <div className="h-14 animate-pulse rounded-lg bg-background/75" />
    )
  }

  if (!data) return null

  return (
    <div className="flex items-center gap-0 rounded-lg bg-[#f5f0e8] px-4 py-3 text-sm">
      <div className="flex-1 text-center">
        <p className="text-[0.68rem] text-muted-foreground uppercase tracking-wide">Costo hoy</p>
        <p className="font-mono font-semibold text-foreground">{formatCost(data.cost_hoy)}</p>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="flex-1 text-center">
        <p className="text-[0.68rem] text-muted-foreground uppercase tracking-wide">Costo 7d</p>
        <p className="font-mono font-semibold text-foreground">{formatCost(data.cost_7d)}</p>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="flex-1 text-center">
        <p className="text-[0.68rem] text-muted-foreground uppercase tracking-wide">Promedio/consulta</p>
        <p className="font-mono font-semibold text-foreground">{formatCost(data.avg_per_query)}</p>
      </div>
    </div>
  )
}
