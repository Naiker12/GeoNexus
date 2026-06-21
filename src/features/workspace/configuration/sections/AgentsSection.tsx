import * as React from "react"
import {
  BrainCircuitIcon,
  FileTextIcon,
  MessageSquareIcon,
  NetworkIcon,
  TagIcon,
  ServerIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Loader2Icon,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { NativeSelect } from "@/components/ui/native-select"
import { listAgents, toggleAgent, setAgentModel } from "@/features/agents/api"
import type { Agent } from "@/features/agents/types"
import { useConnectors } from "@/contexts/ConnectorsContext"

const KIND_ICON: Record<string, React.FC<{ className?: string }>> = {
  document: FileTextIcon,
  embedding: BrainCircuitIcon,
  graph: NetworkIcon,
  classifier: TagIcon,
  chat: MessageSquareIcon,
}

const KIND_COLOR: Record<string, string> = {
  document: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  embedding: "border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  graph: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  classifier: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  chat: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
}

const KIND_LABEL: Record<string, string> = {
  document: "Documento",
  embedding: "Embedding",
  graph: "Grafo",
  classifier: "Clasificador",
  chat: "Chat",
}

function formatRelativeTime(ts: number | null): string {
  if (!ts) return ""
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return "hace segundos"
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

interface SystemAgent {
  id: string
  name: string
  description: string
  icon: React.FC<{ className?: string }>
  status: "active" | "standby"
}

const SYSTEM_AGENTS: SystemAgent[] = [
  {
    id: "containers-mcp",
    name: "Containers MCP",
    description: "Gestor de conectores locales y cloud (archivos, OneDrive, S3…)",
    icon: ServerIcon,
    status: "active",
  },
]

function AgentRow({
  agent,
  onToggle,
  toggling,
  onSetModel,
}: {
  agent: Agent
  onToggle: (id: string, active: boolean) => void
  toggling: boolean
  onSetModel: (id: string, modelName: string | null) => void
}) {
  const Icon = KIND_ICON[agent.kind] ?? FileTextIcon
  const color = KIND_COLOR[agent.kind] ?? "border-muted bg-muted/40 text-muted-foreground"

  return (
    <div className="relative flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
      {toggling && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/50">
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${color}`}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{agent.name}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
            {KIND_LABEL[agent.kind] ?? agent.kind}
          </span>
        </div>
        {agent.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{agent.description}</p>
        )}
        <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground/70">
          {agent.model && <span>Modelo: {agent.model}</span>}
          {agent.provider && <span>Proveedor: {agent.provider}</span>}
          {!agent.model && !agent.provider && <span>Sin configuración de modelo</span>}
        </div>
        {agent.is_active && (
          <div className="mt-1.5 flex items-center gap-2">
            <NativeSelect
              value={agent.model_name ?? ""}
              onChange={(e) => onSetModel(agent.id, e.target.value || null)}
              className="text-[10px] h-6"
            >
              <option value="">— Usar modelo por defecto —</option>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="claude-3-opus">claude-3-opus</option>
              <option value="claude-3-sonnet">claude-3-sonnet</option>
              <option value="claude-3-haiku">claude-3-haiku</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              <option value="llama-3.1-70b">llama-3.1-70b</option>
              <option value="llama-3.1-8b">llama-3.1-8b</option>
            </NativeSelect>
            {agent.last_run_at ? (
              <span className="text-[10px] text-muted-foreground/60">Última ejecución: {formatRelativeTime(agent.last_run_at)}</span>
            ) : (
              <span className="text-[10px] text-muted-foreground/40">Nunca ejecutado</span>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1">
        <Switch checked={agent.is_active} onCheckedChange={(c) => onToggle(agent.id, c)} />
        <span className={`flex items-center gap-1 text-[10px] ${agent.is_active ? "text-green-600" : "text-muted-foreground"}`}>
          {agent.is_active ? <CheckCircle2Icon className="size-3" /> : <XCircleIcon className="size-3" />}
          {agent.is_active ? "Activo" : "Inactivo"}
        </span>
      </div>
    </div>
  )
}

export function AgentsSection() {
  const [agents, setAgents] = React.useState<Agent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [toggling, setToggling] = React.useState<string | null>(null)
  const { connectors: availableModels } = useConnectors()

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

  const handleSetModel = async (id: string, modelName: string | null) => {
    try {
      await setAgentModel(id, modelName)
      setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, model_name: modelName } : a)))
    } catch {
      console.error("Error al asignar modelo")
    }
  }

  const processing = agents.filter((a) => ["document", "embedding"].includes(a.kind))
  const knowledge = agents.filter((a) => ["graph", "classifier"].includes(a.kind))
  const interaction = agents.filter((a) => a.kind === "chat")

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
          Agentes de IA
        </h3>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          Todos los agentes del sistema. Activa o desactiva cada uno según necesites.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2Icon className="mr-2 size-4 animate-spin" />
          Cargando agentes...
        </div>
      ) : (
        <>
          <SectionGroup label="Procesamiento" agents={processing} onToggle={handleToggle} toggling={toggling} onSetModel={handleSetModel} />
          <SectionGroup label="Conocimiento" agents={knowledge} onToggle={handleToggle} toggling={toggling} onSetModel={handleSetModel} />
          <SectionGroup label="Interacción" agents={interaction} onToggle={handleToggle} toggling={toggling} onSetModel={handleSetModel} />

          <div>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Sistema
            </h4>
            <div className="flex flex-col gap-1.5">
              {SYSTEM_AGENTS.map((sa) => {
                const Icon = sa.icon
                const statusColor = sa.status === "active" ? "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400" : "border-muted bg-muted/40 text-muted-foreground"
                return (
                  <div key={sa.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 shadow-sm">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${statusColor}`}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{sa.name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColor}`}>
                          {sa.status === "active" ? "Activo" : "Standby"}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{sa.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SectionGroup({
  label,
  agents,
  onToggle,
  toggling,
  onSetModel,
}: {
  label: string
  agents: Agent[]
  onToggle: (id: string, active: boolean) => void
  toggling: string | null
  onSetModel: (id: string, modelName: string | null) => void
}) {
  if (agents.length === 0) return null
  return (
    <div>
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </h4>
      <div className="flex flex-col gap-1.5">
        {agents.map((a) => (
          <AgentRow key={a.id} agent={a} onToggle={onToggle} toggling={toggling === a.id} onSetModel={onSetModel} />
        ))}
      </div>
    </div>
  )
}
