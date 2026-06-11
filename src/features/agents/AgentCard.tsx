import * as React from "react"
import { CheckCircle2Icon, XCircleIcon, Loader2Icon } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import type { Agent } from "./types"

interface AgentCardProps {
  agent: Agent
  onToggle: (id: string, active: boolean) => void
  toggling: boolean
}

export function AgentCard({ agent, onToggle, toggling }: AgentCardProps) {
  return (
    <article className="relative rounded-lg border bg-card p-3 shadow-sm">
      {toggling && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/50">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium">{agent.name}</h3>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {agent.kind}
            </span>
          </div>
          {agent.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{agent.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {agent.model && <span>Modelo: {agent.model}</span>}
            {agent.provider && <span>Proveedor: {agent.provider}</span>}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Switch
            checked={agent.is_active}
            onCheckedChange={(checked) => onToggle(agent.id, checked)}
          />
          <span
            className={`flex items-center gap-1 text-[10px] ${
              agent.is_active ? "text-green-600" : "text-muted-foreground"
            }`}
          >
            {agent.is_active ? (
              <CheckCircle2Icon className="size-3" />
            ) : (
              <XCircleIcon className="size-3" />
            )}
            {agent.is_active ? "Activo" : "Inactivo"}
          </span>
        </div>
      </div>
    </article>
  )
}
