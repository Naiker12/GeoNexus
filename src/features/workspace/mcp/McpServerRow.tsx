import { cn } from "@/lib/utils"
import type { McpServer } from "@/types/mcp"
import { useState } from "react"

interface McpServerRowProps {
  server: McpServer
  isActive: boolean
  onSelect: () => void
  onPing: () => Promise<unknown>
  onEdit: () => void
  onDelete: () => void
  onDiscoverTools: () => Promise<void>
}

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-500",
  offline: "bg-red-500",
  pending: "bg-amber-500",
  degraded: "bg-orange-500",
}

const STATUS_LABEL: Record<string, string> = {
  online: "online",
  offline: "offline",
  pending: "pendiente",
  degraded: "degradado",
}

export function McpServerRow({
  server,
  isActive,
  onSelect,
  onPing,
  onEdit,
  onDelete,
  onDiscoverTools,
}: McpServerRowProps) {
  const [pinging, setPinging] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const isStdio = server.transport === "stdio"
  const isDisabled = server.disabled
  const toolsCount = server.tools?.length ?? server.tools_count

  const handlePing = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isStdio) return
    setPinging(true)
    try { await onPing() }
    finally { setPinging(false) }
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group grid grid-cols-[2.5rem_1fr_auto_5rem_5rem_auto] items-center gap-3 px-3 py-2 rounded-lg border border-transparent transition-colors cursor-pointer hover:bg-muted/40 hover:border-border/50",
        isActive && "bg-emerald-500/5 border-emerald-500/30",
        isDisabled && "opacity-40"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex size-8 items-center justify-center rounded-md ring-1 ring-border text-xs font-bold uppercase",
        isStdio
          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          : "bg-muted text-primary"
      )}>
        {server.name[0]?.toUpperCase() ?? "M"}
      </div>

      {/* Name + URL */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">{server.name}</span>
          <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider shrink-0">
            {server.transport.toUpperCase()}
          </span>
        </div>
        <p className="truncate font-mono text-[0.65rem] text-muted-foreground/70 mt-0.5">
          {isStdio
            ? (server.command ?? "comando local")
            : server.url}
        </p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={cn("size-1.5 rounded-full", isDisabled ? "bg-gray-400" : (STATUS_DOT[server.status] ?? "bg-gray-400"))} />
        <span className="text-xs text-muted-foreground">
          {isDisabled ? "desactivado" : (STATUS_LABEL[server.status] ?? server.status)}
        </span>
      </div>

      {/* Tools */}
      <span className="text-xs text-muted-foreground text-center tabular-nums">
        {toolsCount != null ? `${toolsCount} tools` : "—"}
      </span>

      {/* Latency */}
      <span className="text-xs text-muted-foreground text-center tabular-nums">
        {server.latency_ms ? `${server.latency_ms}ms` : (isStdio ? "N/A" : "—")}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {isStdio ? (
          <button
            className="text-[10px] px-2 py-0.5 rounded border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => { e.stopPropagation(); setDiscovering(true); onDiscoverTools().finally(() => setDiscovering(false)) }}
            disabled={discovering}
          >
            {discovering ? "..." : "Descubrir"}
          </button>
        ) : (
          <button
            className="text-[10px] px-2 py-0.5 rounded border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            onClick={handlePing}
            disabled={pinging}
          >
            {pinging ? "..." : "Ping"}
          </button>
        )}
        <button
          className="text-[10px] px-2 py-0.5 rounded border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => { e.stopPropagation(); onEdit() }}
        >
          Editar
        </button>
        <button
          className="text-[10px] px-1.5 py-0.5 rounded border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition-colors"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
