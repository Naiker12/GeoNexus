import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/Button"
import {
  createAutomation, listAutomations, toggleAutomation, deleteAutomation,
  translateNlToCron, startSchedulerWorker, stopSchedulerWorker,
  type Automation,
} from "@/api/chat"

export function SchedulerSection({ projectId }: { projectId: string }) {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [intent, setIntent] = useState("")
  const [nlCron, setNlCron] = useState("")
  const [parsedCron, setParsedCron] = useState("")
  const [cronConfidence, setCronConfidence] = useState(0)
  const [actionType, setActionType] = useState("webhook")
  const [actionUrl, setActionUrl] = useState("")
  const [schedulerRunning, setSchedulerRunning] = useState(false)

  const refresh = useCallback(async () => {
    const items = await listAutomations(projectId)
    setAutomations(items)
    setLoading(false)
  }, [projectId])

  useEffect(() => { refresh() }, [refresh])

  const handleCronTranslate = async () => {
    if (!nlCron.trim()) return
    const result = await translateNlToCron(nlCron)
    setParsedCron(result.cron_expression)
    setCronConfidence(result.confidence)
  }

  const handleCreate = async () => {
    if (!name.trim() || !intent.trim()) return
    await createAutomation({
      projectId,
      name,
      intent,
      actionType,
      actionConfig: actionUrl ? { url: actionUrl } : undefined,
      channel: "scheduler",
      cronExpression: parsedCron || undefined,
    })
    setName("")
    setIntent("")
    setNlCron("")
    setParsedCron("")
    setActionUrl("")
    await refresh()
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    await toggleAutomation(id, enabled)
    await refresh()
  }

  const handleDelete = async (id: string) => {
    await deleteAutomation(id)
    await refresh()
  }

  const handleStartScheduler = async () => {
    await startSchedulerWorker()
    setSchedulerRunning(true)
  }

  const handleStopScheduler = async () => {
    await stopSchedulerWorker()
    setSchedulerRunning(false)
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
            Automatizaciones
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {automations.length} tareas programadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={schedulerRunning ? "secondary" : "outline"}
            size="sm"
            onClick={schedulerRunning ? handleStopScheduler : handleStartScheduler}
          >
            {schedulerRunning ? "Detener worker" : "Iniciar worker"}
          </Button>
        </div>
      </div>

      {/* New automation form */}
      <div className="grid gap-3 rounded border border-border bg-secondary/30 p-4">
        <input
          className="rounded border border-border bg-secondary px-3 py-1.5 text-xs outline-none focus:border-primary"
          placeholder="Nombre de la tarea"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="rounded border border-border bg-secondary px-3 py-1.5 text-xs outline-none focus:border-primary"
          placeholder="Intencion (ej: enviar reporte diario)"
          value={intent}
          onChange={e => setIntent(e.target.value)}
        />

        {/* NL → Cron */}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border border-border bg-secondary px-3 py-1.5 text-xs outline-none focus:border-primary"
            placeholder="Lenguaje natural (ej: cada dia a las 9 am)"
            value={nlCron}
            onChange={e => setNlCron(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCronTranslate()}
          />
          <Button variant="outline" size="sm" onClick={handleCronTranslate}>
            Traducir
          </Button>
        </div>
        {parsedCron && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">Cron:</span>
            <code className="rounded bg-accent/30 px-1.5 py-0.5 font-mono">{parsedCron}</code>
            <span className="text-muted-foreground">
              (confianza: {(cronConfidence * 100).toFixed(0)}%)
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <select
            className="rounded border border-border bg-secondary px-3 py-1.5 text-xs outline-none"
            value={actionType}
            onChange={e => setActionType(e.target.value)}
          >
            <option value="webhook">Webhook</option>
            <option value="message">Mensaje</option>
          </select>
          <input
            className="flex-1 rounded border border-border bg-secondary px-3 py-1.5 text-xs outline-none focus:border-primary"
            placeholder="URL del webhook (si aplica)"
            value={actionUrl}
            onChange={e => setActionUrl(e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <Button variant="default" size="sm" onClick={handleCreate}>
            Crear automatizacion
          </Button>
        </div>
      </div>

      {/* Automation list */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando...</p>
      ) : automations.length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay automatizaciones creadas.</p>
      ) : (
        <div className="grid gap-2">
          {automations.map(a => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded border border-border bg-secondary/30 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${a.enabled ? "bg-green-500" : "bg-gray-400"}`} />
                  <span className="text-xs font-medium">{a.name}</span>
                  {a.cron_expression && (
                    <code className="rounded bg-accent/30 px-1.5 py-0.5 text-[10px] font-mono">
                      {a.cron_expression}
                    </code>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                  {a.intent} &middot; {a.action_type}
                  {a.last_run_at && ` · ultima ejec: ${new Date(a.last_run_at * 1000).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant={a.enabled ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handleToggle(a.id, !a.enabled)}
                >
                  {a.enabled ? "Pausar" : "Activar"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(a.id)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
