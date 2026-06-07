import { BrainCircuitIcon, GaugeIcon } from "lucide-react"

import {
  modelUsage,
  skillUsage,
} from "@/features/workspace/analysis/analysis-data"
import { cn } from "@/lib/utils"

const totalModelTokens = modelUsage.reduce((sum, item) => sum + item.tokens, 0)

export function AnalysisSidePanels() {
  return (
    <aside className="grid content-start gap-3">
      <ModelUsagePanel />
      <SkillPanel />
    </aside>
  )
}

function ModelUsagePanel() {
  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <GaugeIcon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Uso por modelo</h2>
      </div>
      <div className="grid gap-3">
        {modelUsage.map((item) => {
          const percent = Math.round((item.tokens / totalModelTokens) * 100)

          return (
            <article key={item.model} className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.model}</p>
                  <p className="text-xs text-muted-foreground">{item.provider}</p>
                </div>
                <span className="text-xs font-medium">{percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", item.color)}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {item.tokens.toLocaleString()} tokens / {item.requests} solicitudes
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function SkillPanel() {
  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <BrainCircuitIcon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Skills usadas</h2>
      </div>
      <div className="grid gap-2">
        {skillUsage.map((item) => (
          <article
            key={item.skill}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-border bg-background/75 p-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.skill}</p>
              <p className="text-xs text-muted-foreground">{item.calls} llamadas</p>
            </div>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
              {item.accuracy}
            </span>
          </article>
        ))}
      </div>
    </section>
  )
}
