import { useState } from "react"
import {
  GitBranchIcon,
  HardDriveIcon,
  Loader2Icon,
  RefreshCwIcon,
  WorkflowIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { EventStatusBadge, Metric } from "@/features/workspace/data/DataUi"
import {
  formatBytes,
  formatRelativeTime,
} from "@/features/workspace/data/data-data"
import type { DataStoreMetrics, SyncEvent } from "@/types/data"

export function StoresPanel({ metrics }: { metrics: DataStoreMetrics }) {
  const stores = [
    {
      name: "SQLite metadata",
      role: "Inventario, rutas, ETags y sync logs",
      value: `${metrics.total_assets} assets`,
      detail: "Sin tokens; solo metadata operativa.",
    },
    {
      name: "Cache cifrado",
      role: "Archivos descargados para modo offline",
      value: formatBytes(metrics.cache_size_bytes),
      detail: "AES-256-GCM, limite objetivo 5 GB.",
    },
    {
      name: "ChromaDB",
      role: "Embeddings y busqueda semantica",
      value: `${metrics.total_embeddings} vectores`,
      detail: "Alimenta recall y respuestas citadas.",
    },
    {
      name: "Knowledge Graph",
      role: "Relaciones norma-zona-capa-documento",
      value: `${metrics.total_graph_nodes} nodos`,
      detail: "Contexto relacional para GeoNexus IA.",
    },
  ]

  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <HardDriveIcon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Memoria y almacenamiento</h2>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-1.5">
        <Metric label="Listos" value={String(metrics.assets_ready)} />
        <Metric label="Pendientes" value={String(metrics.assets_pending)} />
      </div>

      <div className="grid gap-2">
        {stores.map((store) => (
          <article
            key={store.name}
            className="rounded-md border border-border bg-background/75 p-2.5"
          >
            <h3 className="truncate text-sm font-medium">{store.name}</h3>
            <p className="mt-1 text-xs leading-4 text-muted-foreground">
              {store.role}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold">{store.value}</span>
              <span className="truncate text-muted-foreground">{store.detail}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function SyncPanel({
  events,
  isLoading,
  onRefresh,
}: {
  events: SyncEvent[]
  isLoading: boolean
  onRefresh: () => Promise<void> | void
}) {
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <WorkflowIcon className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Sync y eventos</h2>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Actualizar eventos"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCwIcon className={cn("size-3.5", refreshing && "animate-spin")} />
        </Button>
      </div>
      <div className="grid gap-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-md border border-border bg-background/75 p-2.5"
            >
              <div className="h-4 w-28 animate-pulse rounded bg-muted/60" />
              <div className="mt-2 h-3 w-48 animate-pulse rounded bg-muted/60" />
              <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted/60" />
            </div>
          ))
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <WorkflowIcon className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">Sin eventos de sincronización</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Los eventos aparecen cuando se conecta o actualiza una fuente de
              datos.
            </p>
          </div>
        ) : (
          events.map((event) => <SyncEventRow key={event.id} event={event} />)
        )}
      </div>
    </section>
  )
}

export function LineagePanel({ metrics }: { metrics: DataStoreMetrics }) {
  const steps = [
    {
      name: "Conector",
      active: metrics.total_assets > 0,
      tooltip: "Descarga y monitorea fuentes externas",
    },
    {
      name: "Cache",
      active: (metrics.cache_size_bytes ?? 0) > 0,
      tooltip: "AES-256-GCM, máx 5 GB locales",
    },
    {
      name: "Indexador",
      active: metrics.total_chunks > 0,
      tooltip: "Extrae texto, divide en chunks",
    },
    {
      name: "ChromaDB",
      active: metrics.total_embeddings > 0,
      tooltip: "Genera embeddings para búsqueda semántica",
    },
    {
      name: "Knowledge Graph",
      active: metrics.total_graph_nodes > 0,
      tooltip: "Construye relaciones norma↔zona↔capa",
    },
    {
      name: "GeoNexus IA",
      active: true,
      tooltip: "Consume todo el pipeline en cada consulta",
    },
  ]

  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <GitBranchIcon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Flujo de datos</h2>
      </div>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
        {steps.map((step, index) => (
          <div
            key={step.name}
            className={cn(
              "group relative rounded-md border px-2.5 py-2 transition-all cursor-help select-none",
              step.active
                ? "border-primary/40 bg-primary/5 shadow-sm"
                : "border-border bg-background/75"
            )}
          >
            <p className="text-[0.68rem] text-muted-foreground">
              Paso {index + 1}
            </p>
            <p
              className={cn(
                "mt-0.5 truncate text-sm font-semibold",
                step.active ? "text-primary" : "text-muted-foreground/60"
              )}
            >
              {step.name}
            </p>

            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-44 -translate-x-1/2 rounded-md border border-border bg-popover p-2 text-center text-[0.7rem] leading-normal text-popover-foreground opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 z-50">
              <p className="font-semibold text-foreground mb-0.5">{step.name}</p>
              <p className="text-muted-foreground">{step.tooltip}</p>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover" />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Los conectores alimentan cache local cifrado, SQLite guarda metadata sin secretos,
        ChromaDB almacena vectores y el Knowledge Graph une normas, capas, zonas y documentos.
      </p>
    </section>
  )
}

function SyncEventRow({ event }: { event: SyncEvent }) {
  const connectorId = event.connector_id ?? "sistema"
  const prefix = connectorId.split("-")[0]?.toLowerCase()

  let colorClasses = "bg-muted/40 text-muted-foreground border-muted-foreground/20"
  if (prefix === "local") {
    colorClasses = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
  } else if (prefix === "demo") {
    colorClasses = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  } else if (["cloud", "s3", "onedrive", "sharepoint", "gdrive", "dropbox"].includes(prefix)) {
    colorClasses = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
  }

  return (
    <article className="rounded-md border border-border bg-background/75 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[0.68rem] font-semibold transition-colors ${colorClasses}`}>
          {connectorId}
        </span>
        <EventStatusBadge eventType={event.event_type} />
      </div>
      <p className="mt-1.5 text-xs leading-4 text-card-foreground">
        {event.detail ?? "Sin detalle"}
      </p>
      <p className="mt-1 font-mono text-[0.68rem] text-muted-foreground">
        {formatRelativeTime(event.created_at)}
        {event.trace_id && (
          <span className="ml-2 text-muted-foreground/60">{event.trace_id}</span>
        )}
      </p>
    </article>
  )
}
