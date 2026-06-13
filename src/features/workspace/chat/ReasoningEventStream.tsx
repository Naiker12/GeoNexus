import { useAgentPipeline } from "@/features/workspace/agents/hooks/useAgentPipeline"
import { AgentCard } from "@/features/workspace/agents/AgentCard"

export function ReasoningEventStream({ goal, onDone }: { goal: string; onDone?: (answer: string) => void }) {
  const { events, running, finalAnswer, error, run } = useAgentPipeline()

  const handleRun = async () => {
    await run(goal)
    if (finalAnswer) onDone?.(finalAnswer)
  }

  if (events.length === 0 && !running) {
    return (
      <button onClick={handleRun} className="btn-ghost text-xs">
        Iniciar pipeline de análisis
      </button>
    )
  }

  return (
    <div className="space-y-1.5">
      {events.map((evt, i) => (
        <AgentCard key={i} event={evt} compact />
      ))}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
