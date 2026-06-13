import { useAgentPipeline } from "@/features/workspace/agents/hooks/useAgentPipeline"
import { ReasoningPanel } from "@/features/workspace/agents/ReasoningPanel"
import { PlannerView } from "@/features/workspace/agents/PlannerView"
import { DiscoveryView } from "@/features/workspace/agents/DiscoveryView"

export function AgentsPipeline({ goal, onReset }: { goal?: string; onReset?: () => void }) {
  const { events, running, plan, assets, finalAnswer, error, run, reset } = useAgentPipeline()

  const handleRun = () => {
    if (goal) run(goal)
  }

  return (
    <div className="grid gap-3">
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

      {!running && !finalAnswer && !error && (
        <button onClick={handleRun} className="btn-primary text-sm w-fit">
          Ejecutar pipeline
        </button>
      )}

      {finalAnswer && (
        <button onClick={() => { reset(); onReset?.() }} className="btn-ghost text-xs w-fit">
          Nuevo análisis
        </button>
      )}
    </div>
  )
}
