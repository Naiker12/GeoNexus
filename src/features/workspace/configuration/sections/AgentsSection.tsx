import * as React from "react"
import { listAgents, toggleAgent } from "@/features/agents/api"
import { AgentCard } from "@/features/agents/AgentCard"
import type { Agent } from "@/features/agents/types"
import { Loader2Icon } from "lucide-react"

export function AgentsSection() {
  const [agents, setAgents] = React.useState<Agent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [toggling, setToggling] = React.useState<string | null>(null)

  React.useEffect(() => {
    listAgents()
      .then(setAgents)
      .catch(() => console.error("Error al cargar agentes"))
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = async (id: string, active: boolean) => {
    setToggling(id)
    try {
      await toggleAgent(id, active)
      setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: active } : a)))
    } catch {
      console.error("Error al cambiar estado del agente")
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
          Agentes de IA
        </h3>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          Agentes disponibles para procesar documentos y responder consultas.
        </p>
      </div>

      <div className="grid gap-2">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2Icon className="mr-2 size-4 animate-spin" />
            Cargando agentes...
          </div>
        ) : agents.length === 0 ? (
          <div className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
            No hay agentes configurados
          </div>
        ) : (
          agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onToggle={handleToggle}
              toggling={toggling === agent.id}
            />
          ))
        )}
      </div>
    </div>
  )
}
