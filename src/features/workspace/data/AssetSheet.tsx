import { useState } from "react"
import {
  BrainCircuitIcon,
  CheckIcon,
  ExternalLinkIcon,
  FileSearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/Button"
import { deleteDataAsset } from "@/api/data"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Info, Metric } from "@/features/workspace/data/DataUi"
import {
  cacheLabel,
  formatBytes,
  formatRelativeTime,
  statusLabel,
} from "@/features/workspace/data/data-data"
import { DocumentAssetIcon } from "@/features/workspace/documents/DocumentAssetIcon"
import type { DataAsset } from "@/types/data"

type AssetSheetProps = {
  asset?: DataAsset
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
}

export function AssetSheet({ asset, open, onOpenChange, onRefresh }: AssetSheetProps) {
  const [attached, setAttached] = useState(false)

  if (!asset) return <Sheet open={open} onOpenChange={onOpenChange} />

  const a = asset

  function handleVerFuente() {
    if (a.location.startsWith("http://") || a.location.startsWith("https://")) {
      window.open(a.location, "_blank")
    } else {
      toast.success(`Ruta local: ${a.location}`, {
        description: "La apertura local requiere integración con el explorador de archivos.",
      })
    }
  }

  function handleUsarEnIA() {
    setAttached((prev) => !prev)
    if (!attached) {
      toast.success("Asset adjuntado al contexto de la próxima consulta")
    } else {
      toast.success("Asset removido del contexto")
    }
    onRefresh()
  }

  async function handleDelete() {
    const confirmed = window.confirm(`¿Eliminar "${a.name}"?\nSe borrarán chunks, embeddings y eventos asociados.`)
    if (!confirmed) return
    try {
      await deleteDataAsset(a.id)
      toast.success(`"${a.name}" eliminado`)
      onOpenChange(false)
      onRefresh()
    } catch (e) {
      toast.error(`Error al eliminar: ${e}`)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(94vw,28rem)] gap-0 border-border bg-card/95 p-0 text-card-foreground shadow-[0_18px_70px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:max-w-[28rem]">
        <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
        <SheetHeader className="border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-border">
              <DocumentAssetIcon kind={asset.kind} className="size-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base">{asset.name}</SheetTitle>
              <SheetDescription className="mt-1">
                {asset.source} / {formatBytes(asset.size_bytes)} / {formatRelativeTime(asset.updated_at)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="grid gap-3 overflow-auto p-4 [scrollbar-width:thin]">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Chunks" value={String(asset.chunks)} />
            <Metric label="Vectores" value={String(asset.embeddings)} />
            <Metric label="Nodos" value={String(asset.graph_nodes)} />
          </div>

          <section className="rounded-lg border border-border bg-background/75 p-3">
            <h3 className="text-sm font-semibold">Estado operativo</h3>
            <div className="mt-2 grid gap-2 text-sm">
              <Info label="Estado" value={statusLabel[asset.status]} />
              <Info label="Cache" value={cacheLabel[asset.cache_state]} />
              <Info label="Ruta" value={asset.location} />
              <Info label="Conector" value={asset.connector_id ?? "—"} />
              <Info label="Agente" value={asset.agent_id ?? "—"} />
              <Info label="Workspace" value={asset.workspace_id ?? "—"} />
              {asset.trace_id && <Info label="Trace ID" value={asset.trace_id} />}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background/75 p-3">
            <h3 className="text-sm font-semibold">Lineage</h3>
            <div className="mt-3 grid gap-2">
              {getLineageSteps(asset).map((step, index) => (
                <div key={`${step}-${index}`} className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <SheetFooter className="border-t border-border bg-card/95 p-3">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2">
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash2Icon className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleVerFuente}>
              <FileSearchIcon className="size-4" />
              Ver fuente
            </Button>
            <Button size="sm" onClick={handleUsarEnIA}>
              {attached ? (
                <CheckIcon className="size-4" />
              ) : (
                <BrainCircuitIcon className="size-4" />
              )}
              {attached ? "En contexto ✓" : "Usar en IA"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/** Genera pasos de lineage basado en el source del asset */
function getLineageSteps(asset: DataAsset): string[] {
  const steps: string[] = []

  // Source
  const sourceNames: Record<string, string> = {
    onedrive: "OneDrive",
    sharepoint: "SharePoint",
    google_drive: "Google Drive",
    dropbox: "Dropbox",
    s3: "Amazon S3",
    local: "Carpeta local",
  }
  steps.push(sourceNames[asset.source] ?? asset.source)

  // Cache
  if (asset.cache_state !== "none") {
    steps.push("Cache local")
  }

  // Indexer
  const indexerNames: Record<string, string> = {
    document: "Extractor PDF/DOCX",
    layer: "Indexador GIS",
    shapefile: "Indexador GIS",
    csv: "Parser CSV",
    raster: "Indexador Raster",
    other: "Indexador genérico",
  }
  steps.push(indexerNames[asset.kind] ?? "Indexador")

  // ChromaDB (if has embeddings)
  if (asset.embeddings > 0) {
    steps.push("ChromaDB")
  }

  // Knowledge Graph (if has graph nodes)
  if (asset.graph_nodes > 0) {
    steps.push("Knowledge Graph")
  }

  return steps
}
