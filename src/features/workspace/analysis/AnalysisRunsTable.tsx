import { useState } from "react"
import { ActivityIcon, CopyIcon, ExternalLinkIcon, WrenchIcon } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { useAnalysisRuns } from "@/features/workspace/analysis/useAnalysis"
import type { AnalysisRun } from "@/types/analysis"

const PAGE_SIZE = 10

function relativeTime(ts: number): string {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return "hace unos segundos"
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  const days = Math.floor(diff / 86400)
  return days === 1 ? "ayer" : `hace ${days} días`
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

function copyTraceId(id: string | null) {
  if (!id) return
  navigator.clipboard.writeText(id).then(() => {
    toast.success("Trace ID copiado")
  })
}

function TraceDetailDialog({
  run,
  open,
  onOpenChange,
}: {
  run: AnalysisRun | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  if (!run) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{run.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 text-sm">
          <div className="grid grid-cols-[7rem_1fr] gap-2">
            <span className="text-muted-foreground">Modelo</span>
            <span className="font-medium">{run.model}</span>

            <span className="text-muted-foreground">Tokens</span>
            <span className="font-medium">{run.tokens.toLocaleString()}</span>

            <span className="text-muted-foreground">Duración</span>
            <span className="font-medium">{formatDuration(run.duration_ms)}</span>

            <span className="text-muted-foreground">Tool calls</span>
            <span className="font-medium">{run.tool_calls}</span>

            {run.trace_id ? (
              <>
                <span className="text-muted-foreground">Trace ID</span>
                <code className="flex items-center gap-1.5 font-mono text-xs">
                  {run.trace_id}
                  <button
                    onClick={() => copyTraceId(run.trace_id)}
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    <CopyIcon className="size-3.5" />
                  </button>
                </code>
              </>
            ) : null}

            <span className="text-muted-foreground">Creado</span>
            <span className="font-medium">
              {new Date(run.created_at * 1000).toLocaleString("es-CO")}
            </span>
          </div>

          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(run.id)
                toast.success("ID de mensaje copiado")
              }}
            >
              <CopyIcon className="size-3.5" />
              Copiar ID
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(run.conversation_id)
                toast.success("ID de conversación copiado")
              }}
            >
              <ExternalLinkIcon className="size-3.5" />
              Ir al chat
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AnalysisRunsTable() {
  const { data, loading, error } = useAnalysisRuns()
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState<AnalysisRun | null>(null)
  const items = data ?? []
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (loading) {
    return (
      <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold">Trazas recientes</h2>
          </div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse px-3 py-3">
              <div className="h-4 w-48 rounded bg-muted" />
              <div className="mt-1 h-3 w-32 rounded bg-muted" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
          Error al cargar trazas
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold">Trazas recientes</h2>
            <p className="text-xs text-muted-foreground">
              Cada ejecucion guarda ruta, modelo, tokens y referencia para auditoria.
            </p>
          </div>
          <ActivityIcon className="size-4 text-primary" />
        </div>
        <div className="divide-y divide-border">
          {pageItems.length > 0 ? (
            pageItems.map((run) => (
              <button
                key={run.id}
                onClick={() => setDetail(run)}
                className="w-full text-left grid gap-2 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_8rem_9rem_5rem_7rem] md:items-center hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{run.title}</p>
                  <p className="text-xs text-muted-foreground">{relativeTime(run.created_at)}</p>
                </div>
                <span className="truncate text-xs text-muted-foreground">{run.model}</span>
                <code className="flex items-center gap-1 truncate font-mono text-xs text-muted-foreground">
                  {run.trace_id ? (
                    <>
                      <span
                        onClick={(e) => { e.stopPropagation(); copyTraceId(run.trace_id) }}
                        className="hover:text-foreground transition-colors cursor-pointer"
                        title="Copiar Trace ID"
                      >
                        <CopyIcon className="size-3" />
                      </span>
                      {run.trace_id.slice(-8)}
                    </>
                  ) : (
                    "—"
                  )}
                </code>
                <span className="text-xs font-medium">{run.tokens.toLocaleString()}</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-fit rounded-md px-1.5 py-0.5 text-[0.68rem] font-medium",
                    run.duration_ms < 5000
                      ? "bg-emerald-500/10 text-emerald-600"
                      : run.duration_ms < 15000
                        ? "bg-yellow-500/10 text-yellow-600"
                        : "bg-red-500/10 text-red-500"
                  )}>
                    {formatDuration(run.duration_ms)}
                  </span>
                  {run.tool_calls > 0 ? (
                    <span className="flex items-center gap-1 text-[0.68rem] text-muted-foreground">
                      <WrenchIcon className="size-3" />
                      {run.tool_calls} tools
                    </span>
                  ) : null}
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Sin trazas registradas
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </section>

      <TraceDetailDialog run={detail} open={detail !== null} onOpenChange={(v) => { if (!v) setDetail(null) }} />
    </>
  )
}
