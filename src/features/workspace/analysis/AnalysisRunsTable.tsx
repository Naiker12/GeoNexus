import { ActivityIcon } from "lucide-react"

import { analysisRuns } from "@/features/workspace/analysis/analysis-data"

export function AnalysisRunsTable() {
  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold">Trazas recientes</h2>
          <p className="text-xs text-muted-foreground">
            Cada ejecucion guarda ruta, modelo, tokens y referencia para auditoria.
          </p>
        </div>
        <ActivityIcon className="size-4 text-primary" />
      </div>
      <div className="divide-y divide-border">
        {analysisRuns.map((run) => (
          <article
            key={run.traceId}
            className="grid gap-2 px-3 py-2 md:grid-cols-[minmax(0,1fr)_8rem_9rem_5rem_7rem] md:items-center"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{run.name}</p>
              <p className="text-xs text-muted-foreground">{run.route}</p>
            </div>
            <span className="truncate text-xs text-muted-foreground">{run.model}</span>
            <code className="truncate font-mono text-xs text-muted-foreground">
              {run.traceId}
            </code>
            <span className="text-xs font-medium">{run.tokens}</span>
            <span className="w-fit rounded-md bg-muted px-1.5 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
              {run.status}
            </span>
          </article>
        ))}
      </div>
    </section>
  )
}
