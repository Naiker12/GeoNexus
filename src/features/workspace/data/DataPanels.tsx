import {
  GitBranchIcon,
  HardDriveIcon,
  RefreshCwIcon,
  WorkflowIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
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

export function SyncPanel({ events }: { events: SyncEvent[] }) {
  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <WorkflowIcon className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Sync y eventos</h2>
        </div>
        <Button variant="ghost" size="icon-xs" aria-label="Actualizar eventos">
          <RefreshCwIcon className="size-3.5" />
        </Button>
      </div>
      <div className="grid gap-2">
        {events.map((event) => (
          <SyncEventRow key={event.id} event={event} />
        ))}
      </div>
    </section>
  )
}

export function LineagePanel() {
  const steps = [
    "Conector",
    "Cache",
    "Indexador",
    "ChromaDB",
    "Knowledge Graph",
    "GeoNexus IA",
  ]

  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <GitBranchIcon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Flujo de datos V2</h2>
      </div>
      <div className="grid gap-2 md:grid-cols-6">
        {steps.map((step, index) => (
          <div
            key={step}
            className="rounded-md border border-border bg-background/75 px-2.5 py-2"
          >
            <p className="text-[0.68rem] text-muted-foreground">
              Paso {index + 1}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium">{step}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Segun la arquitectura V2, los conectores alimentan cache local cifrado,
        SQLite guarda metadata sin secretos, ChromaDB almacena vectores y el
        Knowledge Graph une normas, capas, zonas y documentos.
      </p>
    </section>
  )
}

function SyncEventRow({ event }: { event: SyncEvent }) {
  return (
    <article className="rounded-md border border-border bg-background/75 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">
          {event.connector_id ?? "sistema"}
        </p>
        <EventStatusBadge eventType={event.event_type} />
      </div>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">
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
