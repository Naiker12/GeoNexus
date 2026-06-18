import * as React from "react"
import type { AgentMode } from "@/types/coding-agent"

interface AgentModeToggleProps {
  mode: AgentMode
  onChange: (mode: AgentMode) => void
}

export function AgentModeToggle({ mode, onChange }: AgentModeToggleProps) {
  return (
    <div className="px-3 py-2">
      <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Modo de trabajo
      </p>
      <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
        <button
          type="button"
          onClick={() => onChange("chat")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            mode === "chat"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Chat
        </button>
        <button
          type="button"
          onClick={() => onChange("agent")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            mode === "agent"
              ? "bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Agente
        </button>
      </div>
      {mode === "agent" && (
        <p className="mt-1 text-[10px] leading-tight text-amber-600">
          El agente puede planificar, crear archivos y ejecutar tareas
        </p>
      )}
    </div>
  )
}
