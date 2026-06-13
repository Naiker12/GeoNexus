import { cn } from "@/lib/utils"
import type { McpServer } from "@/types/mcp"
import { useState } from "react"

interface McpServerCardProps {
  server: McpServer
  isActive: boolean
  onSelect: () => void
  onPing: () => Promise<unknown>
  onEdit: () => void
}

const STATUS_CONFIG = {
  online:   { dot: "bg-emerald-500", label: "online",    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" },
  offline:  { dot: "bg-red-500",     label: "offline",   badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
  pending:  { dot: "bg-amber-500",   label: "pendiente", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800" },
  degraded: { dot: "bg-orange-500",  label: "degradado", badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800" },
} as const

export function McpServerCard({ server, isActive, onSelect, onPing, onEdit }: McpServerCardProps) {
  const [pinging, setPinging] = useState(false)
  const cfg = STATUS_CONFIG[server.status]

  const handlePing = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setPinging(true)
    try { await onPing() }
    finally { setPinging(false) }
  }

  return (
    <article
      onClick={onSelect}
      className={cn(
        "flex flex-col rounded-lg border bg-card/95 px-2.5 py-2 shadow-sm backdrop-blur transition hover:border-primary/50 cursor-pointer",
        isActive && "border-emerald-500/50 ring-1 ring-emerald-500/50"
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-primary ring-1 ring-border">
            <div className="size-3 text-center text-xs font-bold text-muted-foreground">
              {server.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xs font-semibold">{server.name}</h2>
            <p className="mt-0.5 truncate font-mono text-[0.6rem] text-muted-foreground">
              {server.url}
            </p>
          </div>
        </div>
        <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[0.7rem] font-medium transition-colors border", cfg.badge)}>
          <span className={cn("size-1.5 rounded-full", cfg.dot)} />
          {cfg.label}
        </span>
      </div>

      {server.description && (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-3.5 text-muted-foreground">
          {server.description}
        </p>
      )}

      <div className="mt-2 grid grid-cols-3 gap-2">
        <MetricCol label="TOOLS" value={server.tools?.length?.toString() ?? (server.id ? "—" : "0")} accent />
        <MetricCol label="LATENCIA" value={server.latency_ms ? `${server.latency_ms}ms` : "—"}
          accent={!!server.latency_ms && server.latency_ms < 200} />
        <MetricCol label="ERRORES" value={server.error_count} warn={server.error_count > 0} />
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <button className="btn-ghost flex-1 h-6.5 text-[11px] px-1.5" onClick={onSelect}>
          Ver tools
        </button>
        <button
          className="btn-ghost flex-1 h-6.5 text-[11px] px-1.5"
          onClick={handlePing}
          disabled={pinging}
        >
          {pinging ? "Ping..." : "Ping"}
        </button>
        <button className="btn-ghost flex-1 h-6.5 text-[11px] px-1.5 hidden xl:flex" onClick={onEdit}>
          Editar
        </button>
      </div>
    </article>
  )
}

function MetricCol({ label, value, accent = false, warn = false }: { label: string; value: string | number; accent?: boolean; warn?: boolean }) {
  return (
    <div>
      <p className="text-[0.58rem] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn(
        "mt-0.5 font-mono text-[11px] font-semibold",
        warn ? "text-destructive" : accent ? "text-emerald-500" : "text-foreground"
      )}>
        {value}
      </p>
    </div>
  )
}
