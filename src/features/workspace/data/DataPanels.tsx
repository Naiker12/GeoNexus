import {
  GitBranchIcon,
  HardDriveIcon,
  RefreshCwIcon,
  WorkflowIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { EventStatus } from "@/features/workspace/data/DataUi"
import type {
  DataStoreMetric,
  SyncEvent,
} from "@/features/workspace/data/data-data"

export function StoresPanel({ stores }: { stores: DataStoreMetric[] }) {
  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <HardDriveIcon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Memoria y almacenamiento</h2>
      </div>
      <div className="grid gap-2">
        {stores.map((store) => (
          <article
            key={store.name}
            className="rounded-md border border-border bg-background/75 p-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-medium">{store.name}</h3>
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.68rem] font-medium text-primary">
                {store.status}
              </span>
            </div>
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
        <p className="truncate text-sm font-medium">{event.operation}</p>
        <EventStatus status={event.status} />
      </div>
      <p className="mt-1 text-xs leading-4 text-muted-foreground">
        {event.source} / {event.detail}
      </p>
      <p className="mt-1 font-mono text-[0.68rem] text-muted-foreground">
        {event.time}
      </p>
    </article>
  )
}
