import type { AgentPlan } from "@/types/agents"
import { cn } from "@/lib/utils"

export function PlannerView({ plan }: { plan: AgentPlan }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
        Plan generado
      </h3>
      <p className="text-sm font-medium mb-3">{plan.goal}</p>
      <div className="space-y-1.5">
        {plan.steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium",
              step.status === "done" ? "bg-emerald-500/10 text-emerald-600" :
              step.status === "running" ? "bg-primary/10 text-primary" :
              "bg-muted text-muted-foreground"
            )}>
              {step.status === "done" ? "✓" : step.status === "running" ? "⟳" : i + 1}
            </span>
            <span className="font-medium capitalize">{step.agent}</span>
            <span className="text-muted-foreground">— {step.action}</span>
          </div>
        ))}
      </div>
      {plan.sources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {plan.sources.map((src, i) => (
            <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {src.type}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
