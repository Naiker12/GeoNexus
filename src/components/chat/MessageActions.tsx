import { useState } from "react"
import { Copy, Check, Pencil, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MessageStats } from "@/types/chat"

interface CopyButtonProps {
  content: string
}

export function CopyButton({ content }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = content
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
    }
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copiado" : "Copiar"}
      className={cn(
        "p-1 rounded-md transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-muted/60",
        copied && "text-emerald-500"
      )}
    >
      {copied
        ? <Check className="h-3.5 w-3.5" />
        : <Copy className="h-3.5 w-3.5" />
      }
    </button>
  )
}

interface UserActionsProps {
  onEdit?: () => void
  onRegenerate?: () => void
}

export function UserActions({ onEdit, onRegenerate }: UserActionsProps) {
  return (
    <div className="flex items-center gap-0.5 mt-1.5">
      {onEdit && (
        <button
          onClick={onEdit}
          title="Editar mensaje"
          className="p-1 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          title="Regenerar respuesta"
          className="p-1 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

interface TokenStatsBadgeProps {
  stats: MessageStats
  provider?: string
  model?: string
  cumulativeContext?: { totalTokens: number; contextWindow: number }
}

export function TokenStatsBadge({ stats, provider, model, cumulativeContext }: TokenStatsBadgeProps) {
  const [open, setOpen] = useState(false)

  const SIZE = 26
  const STROKE = 3
  const R = (SIZE - STROKE) / 2
  const C = 2 * Math.PI * R
  const cumulativePct = cumulativeContext
    ? Math.min((cumulativeContext.totalTokens / cumulativeContext.contextWindow) * 100, 100)
    : Math.min(stats.context_used_pct, 100)
  const offset = C - (cumulativePct / 100) * C

  const fmt = (n: number) => n.toLocaleString("es-CO")
  const fmtPct = (n: number) => n.toFixed(1) + "%"
  const fmtSec = (ms: number) => (ms / 1000).toFixed(2) + "s"
  const fmtSpeed = (n: number) => Math.round(n) + " tok/s"
  const fmtCtx = (used: number, total: number) =>
    `${fmt(used)} / ${fmt(total)} tokens`

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full
                   border border-border/40 bg-muted/40 hover:bg-muted
                   text-[11px] text-muted-foreground hover:text-foreground
                   transition-colors cursor-pointer select-none"
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0">
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
            stroke="currentColor" strokeWidth={STROKE}
            className="text-muted-foreground/20" />
          <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none"
            stroke="currentColor" strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE/2} ${SIZE/2})`}
            className="text-blue-500" />
          <text x={SIZE/2} y={SIZE/2} textAnchor="middle" dominantBaseline="central"
            className="fill-foreground text-[8px] font-semibold"
          >
            {cumulativePct.toFixed(0)}%
          </text>
        </svg>
        <span>{fmt(stats.total_tokens)} tok</span>
        <span className="opacity-40">·</span>
        <span>{fmtSec(stats.duration_ms)}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 z-50 w-64
                          bg-background border border-border/60 rounded-xl
                          shadow-md p-3.5 text-[12px]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-medium text-[13px]">Estadísticas</span>
              {provider && (
                <span className="text-muted-foreground text-[10px]">
                  {provider}
                </span>
              )}
            </div>

            {model && (
              <Row label="Modelo" value={model} muted />
            )}

            <Divider />

            <SectionLabel>Tokens</SectionLabel>
            <Row label="Entrada"  value={fmt(stats.input_tokens)} />
            <Row label="Salida"   value={fmt(stats.output_tokens)} />
            <Row label="Total"    value={fmt(stats.total_tokens)} bold />

            <Divider />

            <SectionLabel>Rendimiento</SectionLabel>
            <Row label="Tiempo"      value={fmtSec(stats.duration_ms)} />
            <Row label="Velocidad"   value={fmtSpeed(stats.tokens_per_second)} green />

            <Divider />

            {stats.cost_usd > 0 && (
              <>
                <SectionLabel>Costo</SectionLabel>
                <Row label="Este mensaje" value={`$${stats.cost_usd.toFixed(4)}`} />
                <Divider />
              </>
            )}

            <div className="mt-2">
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>Contexto usado</span>
                <span className="font-medium text-foreground">
                  {fmtPct(stats.context_used_pct)}
                </span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${Math.min(stats.context_used_pct, 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {fmtCtx(stats.input_tokens, stats.context_window)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Row({
  label, value, muted, bold, green
}: {
  label: string; value: string; muted?: boolean; bold?: boolean; green?: boolean
}) {
  return (
    <div className="flex justify-between items-center py-0.5 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={
        bold  ? "font-medium" :
        green ? "text-green-600 dark:text-green-400 font-medium" :
        muted ? "text-muted-foreground text-[11px]" :
        "font-medium"
      }>
        {value}
      </span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide mb-1 mt-2 first:mt-0">
      {children}
    </div>
  )
}

function Divider() {
  return <hr className="border-border/30 my-2" />
}
