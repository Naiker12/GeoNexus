import { cn } from "@/lib/utils"
import type { McpServer } from "@/types/mcp"
import { useState } from "react"

interface McpServerCardProps {
  server: McpServer
  isActive: boolean
  onSelect: () => void
  onPing: () => Promise<unknown>
  onEdit: () => void
  onDelete: () => Promise<void>
  onDiscoverTools: () => Promise<void>
}

const STATUS_CONFIG = {
  online:   { dot: "bg-emerald-500", label: "online",    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" },
  offline:  { dot: "bg-red-500",     label: "offline",   badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
  pending:  { dot: "bg-amber-500",   label: "pendiente", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800" },
  degraded: { dot: "bg-orange-500",  label: "degradado", badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800" },
} as const

const TRANSPORT_LABEL: Record<string, { icon: string; label: string }> = {
  http:  { icon: "\u{1F310}", label: "HTTP" },
  stdio: { icon: "\u26A1", label: "STDIO" },
  sse:   { icon: "\u{1F517}", label: "SSE" },
}

type ErrorHintData = { icon: string; label: string; action: string; actionLabel: string }

function errorHint(error?: string): ErrorHintData | null {
  if (!error) return null
  if (error.includes("Conexión fallida"))  return { icon: "\u26A0", label: "Servidor no iniciado", action: "instructions", actionLabel: "Ver instrucciones" }
  if (error.includes("Auth requerida") || error.includes("401")) return { icon: "\u{1F511}", label: "Token requerido", action: "configure", actionLabel: "Agregar token" }
  if (error.includes("Acceso denegado") || error.includes("403")) return { icon: "\u{1F512}", label: "Token sin permisos", action: "configure", actionLabel: "Cambiar token" }
  if (error.includes("no encontrado") || error.includes("404"))   return { icon: "\u2753", label: "URL incorrecta", action: "edit", actionLabel: "Verificar URL" }
  if (error.includes("415")) return { icon: "\u2699", label: "Protocolo no compatible", action: "edit", actionLabel: "Verificar config" }
  if (error.includes("Timeout")) return { icon: "\u23F1", label: "Timeout — servidor lento", action: "ping", actionLabel: "Reintentar" }
  if (error.includes("Rate limit") || error.includes("429")) return { icon: "\u{1F504}", label: "Rate limit excedido", action: "ping", actionLabel: "Reintentar" }
  if (error.includes("Handshake OK")) return { icon: "\u26A0", label: "Online (sin tools/list)", action: "discover", actionLabel: "Descubrir tools" }
  if (error.includes("stdio")) return { icon: "\u26A1", label: "Servidor local (STDIO)", action: "discover", actionLabel: "Descubrir tools" }
  return null
}

export function McpServerCard({ server, isActive, onSelect, onPing, onEdit, onDelete, onDiscoverTools }: McpServerCardProps) {
  const [pinging, setPinging] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isDisabled = server.disabled
  const cfg = isDisabled
    ? { dot: "bg-gray-400", label: "desactivado", badge: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700" }
    : STATUS_CONFIG[server.status]
  const transport = TRANSPORT_LABEL[server.transport] ?? TRANSPORT_LABEL.http
  const isStdio = server.transport === "stdio"

  const handlePing = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isStdio) return
    setPinging(true)
    try { await onPing() }
    finally { setPinging(false) }
  }

  const hint = server.status === "offline" ? errorHint(server.last_error ?? server.last_ping_at ?? undefined) : null
  const toolsCount = server.tools?.length ?? server.tools_count

  const handleHintAction = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hint) return
    if (hint.action === "discover") {
      setDiscovering(true); onDiscoverTools().finally(() => setDiscovering(false))
    } else if (hint.action === "ping") {
      handlePing(e)
    } else {
      onEdit()
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await onDelete() }
    finally { setDeleting(false); setShowDeleteConfirm(false) }
  }

  return (
    <article
      className={cn(
        "group relative cursor-pointer rounded-lg border border-border bg-card/90 p-3 transition-all duration-150 hover:border-foreground/20 hover:shadow-sm",
        isActive && "border-emerald-500/50 ring-1 ring-emerald-500/50",
        server.disabled && "opacity-50"
      )}
    >
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-white/95 dark:bg-zinc-950/95 px-4">
          <p className="text-sm text-center">
            Eliminar <strong>{server.name}</strong>?
            <br /><span className="text-xs text-muted-foreground">Se borrarán sus tools y reglas.</span>
          </p>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-xs border border-border rounded-md hover:bg-muted"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancelar
            </button>
            <button
              className="px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md ring-1 ring-border text-[10px]",
            isStdio ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" : "bg-muted text-primary"
          )}>
            {transport.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-xs font-semibold">{server.name}</h2>
              <span className="text-[9px] text-muted-foreground/60 uppercase">{transport.label}</span>
            </div>
            <p className="mt-0.5 truncate font-mono text-[0.6rem] text-muted-foreground">
              {isStdio
                ? (server.command ? `${server.command} ${(server.args ?? []).slice(0, 2).join(" ")}...` : "comando local")
                : server.url}
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
        <MetricCol label="TOOLS" value={toolsCount?.toString() ?? "\u2014"} accent />
        <MetricCol label="LATENCIA" value={server.latency_ms ? `${server.latency_ms}ms` : (isStdio ? "N/A" : "\u2014")}
          accent={!!server.latency_ms && server.latency_ms < 200} />
        <MetricCol label="ERRORES" value={server.error_count} warn={server.error_count > 0} />
      </div>

      {hint && (
        <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-destructive/5 border border-destructive/15 px-2 py-1">
          <span className="text-[10px]">{hint.icon}</span>
          <span className="text-[10px] text-destructive font-medium flex-1">{hint.label}</span>
          <button
            type="button"
            className="text-[9px] font-semibold text-destructive hover:text-destructive/80 underline underline-offset-2 shrink-0"
            onClick={handleHintAction}
          >
            {discovering ? "Descubriendo..." : hint.actionLabel}
          </button>
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        <button className="btn-ghost flex-1 h-6.5 text-[11px] px-1.5" onClick={onSelect}>
          Ver tools
        </button>
        <button
          className="btn-ghost flex-1 h-6.5 text-[11px] px-1.5"
          onClick={async () => { setDiscovering(true); try { await onDiscoverTools() } finally { setDiscovering(false) } }}
          disabled={discovering}
        >
          {discovering ? "Descubriendo..." : "Descubrir tools"}
        </button>
        <button className="btn-ghost flex-1 h-6.5 text-[11px] px-1.5" onClick={onEdit}>
          Editar
        </button>
        <button
          className="btn-ghost flex-1 h-6.5 text-[11px] px-1.5 text-red-500 hover:text-red-700"
          onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true) }}
        >
          Eliminar
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