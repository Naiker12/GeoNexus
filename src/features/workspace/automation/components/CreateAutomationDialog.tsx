import { useState, useEffect, useCallback } from "react"
import { XIcon, Loader2Icon, SparklesIcon, CheckIcon, AlertCircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { translateNlToCron } from "@/api/chat"
import { ACTION_TYPES, CHANNELS } from "../types"
import type { Automation } from "../types"

type AutomationForm = {
  name: string
  description: string
  intent: string
  action_type: string
  action_config: string
  channel: string
  cron_expression: string
}

interface CreateAutomationDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: AutomationForm) => Promise<void>
  editAutomation?: Automation | null
}

export function CreateAutomationDialog({ open, onClose, onSubmit, editAutomation }: CreateAutomationDialogProps) {
  const [form, setForm] = useState<AutomationForm>({
    name: "",
    description: "",
    intent: "",
    action_type: "chat",
    action_config: "{}",
    channel: "all",
    cron_expression: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [cronResult, setCronResult] = useState<{ cron_expression: string; confidence: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editAutomation) {
      setForm({
        name: editAutomation.name,
        description: editAutomation.description ?? "",
        intent: editAutomation.intent,
        action_type: editAutomation.action_type,
        action_config: editAutomation.action_config
          ? JSON.stringify(editAutomation.action_config, null, 2)
          : "{}",
        channel: editAutomation.channel,
        cron_expression: editAutomation.cron_expression ?? "",
      })
      setCronResult(null)
    } else {
      setForm({ name: "", description: "", intent: "", action_type: "chat", action_config: "{}", channel: "all", cron_expression: "" })
      setCronResult(null)
    }
    setError(null)
  }, [editAutomation, open])

  const handleTranslate = useCallback(async () => {
    if (!form.intent.trim()) return
    setTranslating(true)
    setCronResult(null)
    try {
      const result = await translateNlToCron(form.intent)
      setCronResult(result)
      if (result.cron_expression && !result.cron_expression.startsWith("now+")) {
        setForm(f => ({ ...f, cron_expression: result.cron_expression }))
      }
    } catch (e) {
      setError("Error al interpretar la intención")
    } finally {
      setTranslating(false)
    }
  }, [form.intent])

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("El nombre es requerido"); return }
    if (!form.intent.trim()) { setError("Describe qué debe hacer la automatización"); return }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(form)
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[min(94vw,36rem)] max-h-[90vh] overflow-auto rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">
            {editAutomation ? "Editar automatización" : "Nueva automatización"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80">
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* Nombre */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Resumen semanal de documentos"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </div>

          {/* Intención en lenguaje natural */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              ¿Qué debe hacer? (lenguaje natural)
            </label>
            <div className="relative">
              <textarea
                value={form.intent}
                onChange={e => setForm(f => ({ ...f, intent: e.target.value }))}
                placeholder='Ej: "cada lunes a las 8am resume mis documentos nuevos"'
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none"
              />
              <button
                onClick={handleTranslate}
                disabled={translating || !form.intent.trim()}
                className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/80 disabled:opacity-40"
              >
                {translating ? (
                  <Loader2Icon className="size-3 animate-spin" />
                ) : (
                  <SparklesIcon className="size-3" />
                )}
                Interpretar
              </button>
            </div>
          </div>

          {/* Resultado de interpretación */}
          {cronResult && (
            <div className={cn(
              "rounded-lg border p-3 text-xs",
              cronResult.confidence >= 0.7
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20"
                : "border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20"
            )}>
              <div className="flex items-center gap-1.5 mb-1">
                {cronResult.confidence >= 0.7
                  ? <CheckIcon className="size-3.5 text-emerald-600" />
                  : <AlertCircleIcon className="size-3.5 text-amber-600" />
                }
                <span className="font-medium">
                  {cronResult.confidence >= 0.7 ? "Interpretado" : "Interpretación parcial"}
                </span>
                <span className="text-muted-foreground">
                  (confianza: {Math.round(cronResult.confidence * 100)}%)
                </span>
              </div>
              <code className="text-[11px] bg-background/80 px-1.5 py-0.5 rounded font-mono">
                {cronResult.cron_expression}
              </code>
            </div>
          )}

          {/* Cron expression (manual override) */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Expresión cron (opcional — se auto-completa desde la intención)
            </label>
            <input
              type="text"
              value={form.cron_expression}
              onChange={e => setForm(f => ({ ...f, cron_expression: e.target.value }))}
              placeholder="0 8 * * 1"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary/50"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción (opcional)</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Resume automático semanal"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </div>

          {/* Tipo de acción */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de acción</label>
            <div className="flex flex-wrap gap-2">
              {ACTION_TYPES.map(at => (
                <button
                  key={at.id}
                  onClick={() => setForm(f => ({ ...f, action_type: at.id }))}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-lg border transition-colors text-left",
                    form.action_type === at.id
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <div className="font-medium">{at.label}</div>
                  <div className="text-[10px] opacity-70">{at.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Config JSON */}
          {form.action_type !== "chat" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Configuración (JSON)
              </label>
              <textarea
                value={form.action_config}
                onChange={e => setForm(f => ({ ...f, action_config: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-primary/50 resize-none"
              />
            </div>
          )}

          {/* Canal */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Canal</label>
            <select
              value={form.channel}
              onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
            >
              {CHANNELS.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {submitting && <Loader2Icon className="size-3 animate-spin" />}
            {editAutomation ? "Guardar cambios" : "Crear automatización"}
          </button>
        </div>
      </div>
    </div>
  )
}
