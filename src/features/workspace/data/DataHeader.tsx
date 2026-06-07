import {
  DatabaseIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { Metric } from "@/features/workspace/data/DataUi"
import { dataAssets } from "@/features/workspace/data/data-data"

export function DataHeader() {
  const totalChunks = dataAssets.reduce((total, asset) => total + asset.chunks, 0)
  const totalVectors = dataAssets.reduce(
    (total, asset) => total + asset.embeddings,
    0
  )

  return (
    <header className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
      <div className="p-2.5">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="flex min-w-0 items-start gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <DatabaseIcon className="size-3.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                Centro de datos
              </h1>
              <p className="mt-0.5 max-w-4xl text-xs leading-4 text-muted-foreground">
                Inventario simulado de archivos, cache, embeddings, sync y grafo
                para auditar como entra la informacion a GeoNexus IA.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button size="sm">
              <RefreshCwIcon className="size-4" />
              Reindexar
            </Button>
            <Button variant="outline" size="sm">
              <ShieldCheckIcon className="size-4" />
              Validar datos
            </Button>
          </div>
        </div>

        <div className="mt-2 grid gap-1.5 sm:grid-cols-4">
          <Metric label="Assets" value={String(dataAssets.length)} />
          <Metric label="Chunks" value={String(totalChunks)} />
          <Metric label="Vectores" value={String(totalVectors)} />
          <Metric label="Grafo" value="44 nodos" />
        </div>
      </div>
    </header>
  )
}
