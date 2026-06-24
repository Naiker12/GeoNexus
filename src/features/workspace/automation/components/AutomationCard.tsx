import { cn } from "@/lib/utils"
import {
  PlayIcon,
  PauseIcon,
  ClockIcon,
  CalendarIcon,
  HashIcon,
  GlobeIcon,
  BotIcon,
  FileDownIcon,
  Edit3Icon,
  Trash2Icon,
  Loader2Icon,
} from "lucide-react"
import type { Automation, ActionType } from "../types"

interface AutomationCardProps {
  automation: Automation
  onToggle: (id: string, enabled: boolean) => void
  onEdit: (automation: Automation) => void
  onDelete: (id: string) => void
  onRunNow: (id: string) => void
}

const ACTION_CONFIG: Record<ActionType, { icon: typeof PlayIcon; color: string; label: string }> = {
  chat:    { icon: BotIcon,    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400", label: "Mensaje" },
  webhook: { icon: GlobeIcon, color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", label: "Webhook" },
  skill:   { icon: PlayIcon,  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "Skill" },
  export:  { icon: FileDownIcon, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Exportar" },
}

export function AutomationCard({ automation, onToggle, onEdit, onDelete, onRunNow }: AutomationCardProps) {
  const action = ACTION_CONFIG[automation.action_type as ActionType] ?? ACTION_CONFIG.chat
  const ActionIcon = action.icon

  const formatDate = (ts: number | null) => {
    if (!ts) return "Nunca"
    return new Date(ts * 1000).toLocaleString("es-ES", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  }

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all",
      automation.enabled ? "border-border bg-card/95" : "border-border/50 bg-muted/30 opacity-60"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("rounded-lg p-1.5", action.color)}>
            <ActionIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-medium text-sm leading-tight truncate">{automation.name}</h3>
            <span className="text-[10px] text-muted-foreground">{action.label}</span>
          </div>
        </div>
        <button
          onClick={() => onToggle(automation.id, !automation.enabled)}
          className={cn(
            "w-10 h-5 rounded-full transition-colors relative shrink-0",
            automation.enabled ? "bg-primary" : "bg-muted-foreground/30"
          )}
          title={automation.enabled ? "Desactivar" : "Activar"}
        >
          <span className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
            automation.enabled ? "translate-x-5" : "translate-x-0.5"
          )} />
        </button>
      </div>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        {automation.intent}
      </p>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <ClockIcon className="size-3" />
          {automation.cron_expression || "Sin horario"}
        </span>
        <span className="flex items-center gap-1">
          <CalendarIcon className="size-3" />
          {automation.next_run_at
            ? formatDate(automation.next_run_at)
            : "No programada"}
        </span>
        <span className="flex items-center gap-1">
          <HashIcon className="size-3" />
          {automation.run_count} ejecuciones
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onRunNow(automation.id)}
          disabled={!automation.enabled}
          className="flex items-center justify-center gap-1 flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          <PlayIcon className="size-3" />
          Ejecutar
        </button>
        <button
          onClick={() => onEdit(automation)}
          className="flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <Edit3Icon className="size-3" />
          Editar
        </button>
        <button
          onClick={() => onDelete(automation.id)}
          className="flex items-center justify-center gap-1 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2Icon className="size-3" />
        </button>
      </div>
    </div>
  )
}
