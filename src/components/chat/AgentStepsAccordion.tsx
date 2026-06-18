import * as React from "react"
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, AlertCircle, Zap, FileWarning } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { useCodingAgent } from "@/contexts/CodingAgentContext"
import { AgentFileWritingCard } from "@/components/chat/AgentFileWritingCard"
import type { AgentStatus } from "@/types/coding-agent"

const statusConfig: Record<string, { color: string; label: string }> = {
  idle: { color: "text-muted-foreground", label: "Agente inactivo" },
  clarifying: { color: "text-amber-500", label: "Preguntando..." },
  thinking: { color: "text-amber-500", label: "Analizando objetivo..." },
  planning: { color: "text-amber-500", label: "Planificando..." },
  planning_review: { color: "text-amber-600", label: "Plan listo para revisar" },
  coding: { color: "text-amber-500", label: "Escribiendo archivos..." },
  done: { color: "text-emerald-600", label: "Tarea completada" },
  error: { color: "text-red-500", label: "Error" },
}

export function AgentStepsAccordion() {
  const { state } = useCodingAgent()
  const [manualExpanded, setManualExpanded] = React.useState<boolean | null>(null)
  const [delayedCollapse, setDelayedCollapse] = React.useState(false)
  const [selectedFiles, setSelectedFiles] = React.useState<Set<string>>(new Set())
  const prevStatus = React.useRef<AgentStatus>(state.status)

  React.useEffect(() => {
    if (state.currentPlan) {
      setSelectedFiles(new Set(state.currentPlan.files.filter((f) => f.risk !== "high").map((f) => f.path)))
    }
  }, [state.currentPlan])

  const isRunning = ["clarifying", "thinking", "planning", "planning_review", "coding"].includes(state.status)
  const isFinished = state.status === "done" || state.status === "error"

  React.useEffect(() => {
    if (isRunning) {
      setDelayedCollapse(false)
      setManualExpanded(null)
    } else if (isFinished && prevStatus.current !== state.status) {
      const timer = setTimeout(() => {
        setDelayedCollapse(true)
      }, 2000)
      prevStatus.current = state.status
      return () => clearTimeout(timer)
    }
    prevStatus.current = state.status
  }, [state.status, isRunning, isFinished])

  const isExpanded = manualExpanded ?? (isRunning ? true : !delayedCollapse)

  if (state.mode !== "agent" || state.status === "idle") return null

  const cfg = statusConfig[state.status] ?? statusConfig.idle
  const lastEvent = state.events[state.events.length - 1]
  const summary = lastEvent?.label ?? cfg.label
  const plan = state.currentPlan

  return (
    <div className="overflow-hidden rounded-lg border border-amber-200/50 bg-amber-50/40">
      <button
        type="button"
        onClick={() => setManualExpanded((v) => !(v ?? true))}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-amber-50"
      >
        <span className={`shrink-0 ${cfg.color}`}>
          {isRunning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : state.status === "done" ? (
            <CheckCircle2 className="size-4" />
          ) : state.status === "error" ? (
            <AlertCircle className="size-4" />
          ) : (
            <Zap className="size-4" />
          )}
        </span>
        <span className="flex-1 truncate text-[13px] font-medium text-foreground">
          {summary}
        </span>
        <span className={`text-[11px] ${cfg.color}`}>{cfg.label}</span>
        <span className="shrink-0 text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-amber-200/30 px-3 py-2 space-y-2">
          <AgentFileWritingCard />

          {/* Permission requests */}
          {state.pendingPermissions.length > 0 && (
            <div className="space-y-1">
              {state.pendingPermissions.map((perm) => (
                <div key={perm.id} className="flex items-center gap-2 rounded border border-amber-200 bg-amber-100/60 px-2 py-1.5 text-[11px]">
                  <FileWarning className="size-3.5 shrink-0 text-amber-600" />
                  <span className="flex-1 text-amber-800">
                    El agente quiere <strong>{perm.action === "overwrite" ? "sobrescribir" : perm.action === "delete" ? "eliminar" : "escribir fuera de"}</strong>{" "}
                    <code className="bg-amber-200/70 px-1 rounded">{perm.targetPath}</code>
                    {perm.reason && <span className="block text-amber-600">— {perm.reason}</span>}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100"
                      onClick={() => {
                        const event = new CustomEvent("geonexus:resolve-permission", {
                          detail: { requestId: perm.id, granted: true },
                        })
                        window.dispatchEvent(event)
                      }}
                    >
                      Permitir
                    </button>
                    <button
                      type="button"
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-100"
                      onClick={() => {
                        const event = new CustomEvent("geonexus:resolve-permission", {
                          detail: { requestId: perm.id, granted: false },
                        })
                        window.dispatchEvent(event)
                      }}
                    >
                      Denegar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {plan ? (
            <>
              <p className="text-xs text-amber-900/80">{plan.summary}</p>
              <ul className="space-y-1">
                {plan.files.map((f, i) => {
                  const checked = selectedFiles.has(f.path)
                  return (
                    <li key={i} className="flex items-center gap-2 text-[11px]">
                      <input
                        type="checkbox"
                        className="size-3 accent-amber-600 shrink-0"
                        checked={checked}
                        onChange={() => {
                          const next = new Set(selectedFiles)
                          if (checked) { next.delete(f.path) } else { next.add(f.path) }
                          setSelectedFiles(next)
                        }}
                      />
                      <span className={`size-1.5 rounded-full shrink-0 ${f.risk === "high" ? "bg-red-400" : "bg-emerald-400"}`} />
                      <code className="text-amber-800 bg-amber-100/70 px-1 rounded truncate">{f.path}</code>
                      <span className="text-amber-600 truncate">{f.shortDescription}</span>
                      {f.risk === "high" && (
                        <span
                          className="text-[10px] text-red-500 font-medium shrink-0 cursor-help"
                          title={f.reason || "Este archivo ya existe y será sobrescrito"}
                        >
                          ⚠ requiere aprobación
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
              {state.status === "planning_review" && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={selectedFiles.size === 0}
                    onClick={() => {
                      const filtered = {
                        ...plan,
                        files: plan.files.filter((f) => selectedFiles.has(f.path)),
                      }
                      const event = new CustomEvent("geonexus:approve-plan", { detail: filtered })
                      window.dispatchEvent(event)
                    }}
                  >
                    Aprobar ({selectedFiles.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const event = new CustomEvent("geonexus:edit-plan")
                      window.dispatchEvent(event)
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      const event = new CustomEvent("geonexus:reject-plan")
                      window.dispatchEvent(event)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </>
          ) : isRunning ? (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              Iniciando...
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
