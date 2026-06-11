import * as React from "react"
import { listAgents, toggleAgent } from "./api"
import { AgentCard } from "./AgentCard"
import type { Agent } from "./types"
import { Loader2Icon } from "lucide-react"

export function AgentsPage() {
  const [agents, setAgents] = React.useState<Agent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [toggling, setToggling] = React.useState<string | null>(null)

  const fetchAgents = React.useCallback(async () => {
    setLoading(true)
    try {
      const list = await listAgents()
      setAgents(list)
    } catch {
      console.error("Error al cargar agentes")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

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
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4">
          <h1 className="text-lg font-semibold tracking-tight">Agentes</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Agentes de IA disponibles para procesar documentos y responder consultas.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2Icon className="mr-2 size-5 animate-spin" />
            Cargando agentes...
          </div>
        ) : agents.length === 0 ? (
          <div className="rounded-lg border py-12 text-center text-sm text-muted-foreground">
            No hay agentes configurados
          </div>
        ) : (
          <div className="grid gap-2">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onToggle={handleToggle}
                toggling={toggling === agent.id}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
