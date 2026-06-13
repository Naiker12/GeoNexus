import { useRef, useState } from "react"
import { ReasoningPanel } from "@/features/workspace/agents/ReasoningPanel"
import { PlannerView } from "@/features/workspace/agents/PlannerView"
import { DiscoveryView } from "@/features/workspace/agents/DiscoveryView"
import { useAgentPipeline } from "@/features/workspace/agents/hooks/useAgentPipeline"

export function AgentsPage() {
  const { events, running, plan, assets, finalAnswer, error, run, reset } = useAgentPipeline()
  const inputRef = useRef<HTMLInputElement>(null)
  const [goal, setGoal] = useState("")

  const handleRun = () => {
    if (!goal.trim()) return
    run(goal)
  }

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto grid w-full max-w-[110rem] gap-5">
        <header className="rounded-lg border border-border/80 bg-card/95 p-4 shadow-sm">
          <h1 className="text-base font-semibold">Geo Agents</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Pipeline multi-agente: Planner → Discovery → Knowledge → MCP → Reasoning → Result
          </p>
        </header>

        {!running && !finalAnswer && !error && (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRun()}
              placeholder="Escribe un objetivo para los agentes..."
              className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none ring-primary/30 focus-visible:ring-2"
            />
            <button onClick={handleRun} disabled={!goal.trim()} className="btn-primary h-9 px-4 text-sm">
              Ejecutar
            </button>
          </div>
        )}

        <ReasoningPanel events={events} running={running} />

        {plan && <PlannerView plan={plan} />}
        {assets.length > 0 && <DiscoveryView assets={assets} />}

        {finalAnswer && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-2">
              Resultado
            </h3>
            <p className="text-sm whitespace-pre-wrap">{finalAnswer}</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {finalAnswer && (
          <button onClick={reset} className="btn-ghost text-xs w-fit">
            Nuevo análisis
          </button>
        )}
      </div>
    </section>
  )
}
