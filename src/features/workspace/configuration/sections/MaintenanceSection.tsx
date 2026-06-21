import * as React from "react"
import { Loader2Icon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { maintenanceTasks, type MaintenanceTask } from "@/features/workspace/configuration/settings-data"
import { ConfirmSettingsDialog } from "@/features/workspace/configuration/ConfirmSettingsDialog"
import { cn } from "@/lib/utils"

type TaskResult = {
  status: "idle" | "running" | "success" | "error"
  message?: string
  timestamp?: number
}

export function MaintenanceSection() {
  const [taskResults, setTaskResults] = React.useState<Record<string, TaskResult>>({})
  const [confirmTask, setConfirmTask] = React.useState<MaintenanceTask | null>(null)

  const runTask = async (task: MaintenanceTask) => {
    if (!task.tauriCommand) {
      setTaskResults(prev => ({
        ...prev,
        [task.id]: { status: "error", message: "Sin comando Tauri configurado", timestamp: Date.now() },
      }))
      return
    }

    setTaskResults(prev => ({ ...prev, [task.id]: { status: "running" } }))

    try {
      const { invoke } = await import("@tauri-apps/api/core")
      const result = await invoke<{ message?: string }>(task.tauriCommand)
      setTaskResults(prev => ({
        ...prev,
        [task.id]: {
          status: "success",
          message: result.message ?? "Completado correctamente",
          timestamp: Date.now(),
        }
      }))
    } catch (err) {
      setTaskResults(prev => ({
        ...prev,
        [task.id]: {
          status: "error",
          message: String(err),
          timestamp: Date.now(),
        }
      }))
    }
  }

  const handleRunTask = (task: MaintenanceTask) => {
    if (task.destructive) {
      setConfirmTask(task)
    } else {
      runTask(task)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
            Mantenimiento
          </h3>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Tareas de mantenimiento, limpieza y diagnóstico del sistema.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-7 shrink-0">
          <Trash2Icon className="size-3.5" />
          Limpiar cache
        </Button>
      </div>

      <div className="grid gap-2">
        {maintenanceTasks.map((task) => {
          const result = taskResults[task.id]

          return (
            <article
              key={task.id}
              className="rounded-lg border border-border bg-card/70 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <task.icon className={cn("size-4 shrink-0", task.destructive ? "text-red-400" : "text-primary")} />
                  <div className="min-w-0">
                    <span className={cn("text-sm font-medium", task.destructive ? "text-red-300" : "")}>{task.title}</span>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{task.description}</p>
                    {result && result.status !== "idle" && (
                      <p className={cn(
                        "text-xs mt-0.5",
                        result.status === "success" ? "text-emerald-500" :
                        result.status === "error" ? "text-red-400" :
                        "text-muted-foreground"
                      )}>
                        {result.status === "running" && "Ejecutando..."}
                        {result.status === "success" && `✓ ${result.message}`}
                        {result.status === "error" && `✗ ${result.message}`}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRunTask(task)}
                  disabled={result?.status === "running"}
                  className={cn(
                    "shrink-0 text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    task.destructive
                      ? "border-red-400/50 text-red-400 hover:bg-red-400/10"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {result?.status === "running" ? (
                    <Loader2Icon size={12} className="animate-spin" />
                  ) : (
                    "Ejecutar"
                  )}
                </button>
              </div>
              {task.command && (
                <code className="mt-1.5 block truncate font-mono text-[0.68rem] text-muted-foreground/60">
                  {task.command}
                </code>
              )}
            </article>
          )
        })}
      </div>

      {confirmTask && (
        <ConfirmSettingsDialog
          open
          name={confirmTask.title}
          isDelete
          description={`Esta acción no se puede deshacer. ${confirmTask.description}`}
          onOpenChange={() => setConfirmTask(null)}
          onConfirm={() => { runTask(confirmTask); setConfirmTask(null) }}
        />
      )}
    </div>
  )
}
