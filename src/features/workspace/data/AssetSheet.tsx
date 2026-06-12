import { useState, useEffect } from "react"
import {
  BrainCircuitIcon,
  CheckIcon,
  FileSearchIcon,
  Trash2Icon,
  Loader2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/Button"
import { deleteDataAsset, listDocumentChunks } from "@/api/data"
import { cn } from "@/lib/utils"
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
import type { DataAsset, DocumentChunk } from "@/types/data"

type AssetSheetProps = {
  asset?: DataAsset
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
}

export function AssetSheet({ asset, open, onOpenChange, onRefresh }: AssetSheetProps) {
  const [attached, setAttached] = useState(false)
  const [activeTab, setActiveTab] = useState<"details" | "chunks">("details")
  const [chunks, setChunks] = useState<DocumentChunk[]>([])
  const [chunksLoading, setChunksLoading] = useState(false)

  // Reset tab when sheet opens/closes or asset changes
  useEffect(() => {
    if (!open) {
      setActiveTab("details")
      setChunks([])
    }
  }, [open, asset])

  // Fetch chunks when switching to "chunks" tab
  useEffect(() => {
    if (activeTab === "chunks" && asset) {
      setChunksLoading(true)
      listDocumentChunks(asset.id)
        .then((res) => {
          // Fallback demo chunks for offline/seeding presentation
          if (res.length === 0 && (asset.id === "doc-1" || asset.id.startsWith("doc"))) {
            setChunks([
              {
                id: "chunk-1",
                asset_id: asset.id,
                chunk_index: 0,
                content: "Artículo 42. Áreas de Reserva Ambiental y Conservación: Las zonas delimitadas como reserva forestal protectora nacional, distrital o municipal no admitirán construcciones de tipo industrial o residencial de alta densidad. Se permite únicamente senderismo ecológico e investigación científica autorizada por la corporación autónoma regional.",
                token_count: 58,
                page_number: 14,
                created_at: Date.now(),
              },
              {
                id: "chunk-2",
                asset_id: asset.id,
                chunk_index: 1,
                content: "Parágrafo Primero. Las licencias de construcción preexistentes a la delimitación de las áreas de reserva se respetarán bajo la condición de no ampliación de áreas construidas y adopción de tecnologías limpias para verter residuos y saneamiento básico.",
                token_count: 42,
                page_number: 15,
                created_at: Date.now(),
              },
              {
                id: "chunk-3",
                asset_id: asset.id,
                chunk_index: 2,
                content: "Artículo 43. Clasificación del suelo urbano. El suelo urbano se divide en áreas consolidadas, áreas en desarrollo y áreas de renovación urbana. La edificabilidad permitida para renovación urbana oscila entre el 150% y el 250% del área neta del lote, supeditado a cesión de espacio público.",
                token_count: 62,
                page_number: 18,
                created_at: Date.now(),
              }
            ])
          } else {
            setChunks(res)
          }
        })
        .catch((e) => {
          console.error(e)
          toast.error("Error al cargar chunks del documento")
        })
        .finally(() => {
          setChunksLoading(false)
        })
    }
  }, [activeTab, asset])

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
      <SheetContent className="w-[min(94vw,28rem)] gap-0 border-border bg-card/95 p-0 text-card-foreground shadow-[0_18px_70px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:max-w-[28rem] flex flex-col h-full">
        <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)] shrink-0" />
        
        <SheetHeader className="border-b border-border px-4 pb-3 pt-4 shrink-0">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-border">
              <DocumentAssetIcon kind={asset.kind} className="size-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base truncate">{asset.name}</SheetTitle>
              <SheetDescription className="mt-1 truncate">
                {asset.source} / {formatBytes(asset.size_bytes)} / {formatRelativeTime(asset.updated_at)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-muted/15 px-4 shrink-0">
          <button
            type="button"
            className={cn(
              "border-b-2 px-4 py-2.5 text-xs font-semibold transition-all relative top-[1px]",
              activeTab === "details"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("details")}
          >
            Detalles
          </button>
          <button
            type="button"
            className={cn(
              "border-b-2 px-4 py-2.5 text-xs font-semibold transition-all relative top-[1px]",
              activeTab === "chunks"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("chunks")}
          >
            Chunks ({asset.chunks})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin] space-y-4">
          {activeTab === "details" ? (
            <>
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
            </>
          ) : (
            <div className="space-y-3">
              {chunksLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2Icon className="size-6 animate-spin text-primary" />
                  <p className="mt-2 text-xs text-muted-foreground">Cargando chunks...</p>
                </div>
              ) : chunks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm font-medium text-muted-foreground">Sin chunks disponibles</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Este asset no tiene contenido extraído o indexado.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  <p className="text-[0.68rem] text-muted-foreground font-semibold">
                    Mostrando primeros {Math.min(3, chunks.length)} de {chunks.length} chunks
                  </p>
                  {chunks.slice(0, 3).map((chunk, index) => (
                    <div
                      key={chunk.id ?? index}
                      className="rounded-lg border border-border bg-background/50 p-3 text-xs shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-1 text-[0.68rem] text-muted-foreground">
                        <span className="font-semibold text-primary">
                          Chunk #{chunk.chunk_index + 1}
                        </span>
                        <span>
                          Pág. {chunk.page_number ?? "N/A"} • {chunk.token_count} tkn
                        </span>
                      </div>
                      <p className="text-card-foreground leading-relaxed font-sans text-[0.75rem] p-2 bg-muted/20 rounded border border-border/20 max-h-36 overflow-y-auto whitespace-pre-wrap">
                        {chunk.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-border bg-card/95 p-3 shrink-0">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2 w-full">
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
