import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileSearchIcon,
  HistoryIcon,
  LayersIcon,
  LinkIcon,
  AlertTriangleIcon,
  Loader2Icon,
} from "lucide-react"
import { getSyncEvents } from "@/api/data"
import type { SyncEvent, SyncEventType } from "@/types/data"

const PAGE_SIZE = 5

const EVENT_CONFIG: Record<SyncEventType, { icon: React.FC<{ className?: string }>; label: string }> = {
  discovered: { icon: FileSearchIcon, label: "Descubierto" },
  downloaded: { icon: DownloadIcon, label: "Descargado" },
  indexed: { icon: LayersIcon, label: "Indexado" },
  embedded: { icon: LayersIcon, label: "Embedded" },
  graph_linked: { icon: LinkIcon, label: "Grafo vinculado" },
  conflict: { icon: AlertTriangleIcon, label: "Conflicto" },
  error: { icon: AlertTriangleIcon, label: "Error" },
  conversation_saved: { icon: DownloadIcon, label: "Conversación guardada" },
}

function formatTime(ts: number): string {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return "ahora"
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export function RecentTracesPanel() {
  const [rows, setRows] = React.useState<SyncEvent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(0)

  React.useEffect(() => {
    setLoading(true)
    getSyncEvents("project-default", PAGE_SIZE + 1, page * PAGE_SIZE)
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  const hasMore = rows.length > PAGE_SIZE
  const events = hasMore ? rows.slice(0, PAGE_SIZE) : rows

  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <HistoryIcon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Trazas recientes</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Sin actividad reciente</p>
      ) : (
        <div className="divide-y divide-border">
          {events.map((ev) => {
            const cfg = EVENT_CONFIG[ev.event_type]
            const Icon = cfg?.icon ?? FileSearchIcon
            return (
              <div key={ev.id} className="flex items-center gap-2 py-1.5">
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-xs">
                  {ev.detail ?? cfg?.label ?? ev.event_type}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatTime(ev.created_at)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
        <span className="text-[11px] text-muted-foreground">Página {page + 1}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeftIcon className="size-3" />
            Anterior
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
          >
            Siguiente
            <ChevronRightIcon className="size-3" />
          </button>
        </div>
      </div>
    </section>
  )
}
