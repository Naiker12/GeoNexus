import { useState } from "react"
import {
  DatabaseIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  Loader2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Metric } from "@/features/workspace/data/DataUi"
import { formatBytes } from "@/features/workspace/data/data-data"
import type { DataAsset, DataStoreMetrics } from "@/types/data"

type DataHeaderProps = {
  assets: DataAsset[]
  metrics: DataStoreMetrics
  isLoading: boolean
  onRefresh: () => Promise<void> | void
}

export function DataHeader({ assets, metrics, isLoading, onRefresh }: DataHeaderProps) {
  const [reindexOpen, setReindexOpen] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [validateOpen, setValidateOpen] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<
    { name: string; ok: boolean; detail: string }[] | null
  >(null)

  const totalChunks = assets.reduce((total, asset) => total + asset.chunks, 0)
  const totalVectors = assets.reduce((total, asset) => total + asset.embeddings, 0)
  const totalGraphNodes = assets.reduce((total, asset) => total + asset.graph_nodes, 0)
  const totalSize = assets.reduce((total, asset) => total + (asset.size_bytes ?? 0), 0)

  const skeleton = <div className="h-8 animate-pulse rounded-md bg-muted/60" />

  const metricValue = (val: string) =>
    isLoading ? skeleton : <p className="mt-0.5 text-sm font-semibold leading-4">{val}</p>

  async function handleReindex() {
    setReindexing(true)
    setReindexOpen(false)
    await new Promise((r) => setTimeout(r, 2000))
    setReindexing(false)
    await onRefresh()
  }

  async function handleValidate() {
    setValidating(true)
    setValidateOpen(true)
    // Simulated — mock until backend exists
    await new Promise((r) => setTimeout(r, 1000))
    const stores = [
      { name: "SQLite metadata", ok: true, detail: `${assets.length} assets registrados` },
      { name: "Cache cifrado", ok: metrics.cache_size_bytes > 0, detail: metrics.cache_size_bytes > 0 ? formatBytes(metrics.cache_size_bytes) : "Vacío — esperado sin assets" },
      { name: "ChromaDB", ok: metrics.total_embeddings > 0, detail: metrics.total_embeddings > 0 ? `${metrics.total_embeddings} vectores` : "0 vectores — esperado sin assets" },
      { name: "Knowledge Graph", ok: metrics.total_graph_nodes > 0, detail: metrics.total_graph_nodes > 0 ? `${metrics.total_graph_nodes} nodos` : "0 nodos — esperado sin assets" },
    ]
    setValidationResult(stores)
    setValidating(false)
  }

  return (
    <>
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
                  Inventario de archivos, cache, embeddings, sync y grafo
                  para auditar como entra la informacion a GeoNexus IA.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button size="sm" onClick={() => setReindexOpen(true)} disabled={reindexing}>
                {reindexing ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
                {reindexing ? "Indexando..." : "Reindexar"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleValidate}>
                <ShieldCheckIcon className="size-4" />
                Validar datos
              </Button>
            </div>
          </div>

          <div className="mt-2 grid gap-1.5 sm:grid-cols-5">
            <div className="rounded-md border border-border bg-background/75 px-2.5 py-1.5">
              <p className="text-[0.62rem] leading-3 text-muted-foreground">Assets</p>
              {metricValue(String(assets.length))}
            </div>
            <div className="rounded-md border border-border bg-background/75 px-2.5 py-1.5">
              <p className="text-[0.62rem] leading-3 text-muted-foreground">Chunks</p>
              {metricValue(String(totalChunks))}
            </div>
            <div className="rounded-md border border-border bg-background/75 px-2.5 py-1.5">
              <p className="text-[0.62rem] leading-3 text-muted-foreground">Vectores</p>
              {metricValue(String(totalVectors))}
            </div>
            <div className="rounded-md border border-border bg-background/75 px-2.5 py-1.5">
              <p className="text-[0.62rem] leading-3 text-muted-foreground">Grafo</p>
              {metricValue(`${totalGraphNodes} nodos`)}
            </div>
            <div className="rounded-md border border-border bg-background/75 px-2.5 py-1.5">
              <p className="text-[0.62rem] leading-3 text-muted-foreground">Tamaño</p>
              {metricValue(formatBytes(totalSize))}
            </div>
          </div>
        </div>
      </header>

      <Dialog open={reindexOpen} onOpenChange={setReindexOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reindexar todos los assets</DialogTitle>
            <DialogDescription>
              Esto regenera chunks, vectores y entradas del grafo para todos los
              assets conectados. Puede tomar varios minutos.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReindexOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReindex}>Confirmar reindexación</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={validateOpen} onOpenChange={setValidateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validar stores de datos</DialogTitle>
            <DialogDescription>
              Resultado de la validación por store.
            </DialogDescription>
          </DialogHeader>
          {validating ? (
            <div className="flex items-center justify-center py-6">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : validationResult ? (
            <div className="grid gap-2">
              {validationResult.map((store) => (
                <div
                  key={store.name}
                  className="flex items-center gap-2 rounded-md border border-border bg-background/75 px-3 py-2"
                >
                  <span
                    className={`size-5 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                      store.ok
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {store.ok ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{store.name}</p>
                    <p className="text-xs text-muted-foreground">{store.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={() => setValidateOpen(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
