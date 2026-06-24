import * as React from "react"
import {
  DownloadIcon,
  Loader2Icon,
  RefreshCwIcon,
  Trash2Icon,
  XCircleIcon,
  CheckCircle2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/toast"
import { invoke } from "@tauri-apps/api/core"
import { deleteDataAsset } from "@/api/data"
import { DocumentAssetIcon } from "@/features/workspace/documents/DocumentAssetIcon"
import { cn } from "@/lib/utils"
import type { DataAsset } from "@/types/data"
import type { SortField } from "./DocumentFilters"

type DocumentsListProps = {
  assets: DataAsset[]
  loading: boolean
  indexingAssetId: string | null
  onIndex: (id: string) => void
  searchQuery: string
  sortBy: SortField
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2 animate-pulse"
        >
          <div className="size-5 rounded bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-48 rounded bg-muted" />
            <div className="h-2 w-32 rounded bg-muted" />
          </div>
          <div className="h-5 w-12 rounded bg-muted" />
          <div className="h-5 w-14 rounded bg-muted" />
          <div className="h-5 w-12 rounded bg-muted" />
          <div className="h-7 w-16 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/75 px-3 py-1.5">
      <p className="text-[0.7rem] leading-4 text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold leading-4">{value}</p>
    </div>
  )
}

function Pill({ children }: { children: string }) {
  return (
    <span className="inline-flex h-5 w-fit items-center rounded-md border border-border bg-background px-2 text-[0.7rem] text-muted-foreground">
      {children}
    </span>
  )
}

function DocumentStatus({ status }: { status: string }) {
  const isReady = status === "ready" || status === "Listo" || status === "Analizado"
  const isIndexing = status === "indexing" || status === "Indexando"
  const isPending = status === "pending" || status === "Pendiente"
  const isError = status === "error" || status === "Error"

  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center gap-1 rounded-md px-2 text-[0.7rem] font-medium",
        isReady && "bg-emerald-500/10 text-emerald-700 [.geo-dark_&]:text-emerald-300",
        isIndexing && "bg-sky-500/10 text-sky-700 [.geo-dark_&]:text-sky-300 animate-pulse",
        isPending && "bg-muted text-muted-foreground",
        isError && "bg-destructive/10 text-destructive [.geo-dark_&]:text-red-400"
      )}
    >
      {isReady ? (
        <CheckCircle2Icon className="size-3" />
      ) : isError ? (
        <XCircleIcon className="size-3" />
      ) : null}
      {isReady ? "Listo" : isIndexing ? "Indexando" : isPending ? "Pendiente" : "Error"}
    </span>
  )
}

function DocumentRow({
  asset,
  isIndexing,
  onIndex,
}: {
  asset: DataAsset
  isIndexing: boolean
  onIndex: () => void
}) {
  const { toast } = useToast()
  const [downloading, setDownloading] = React.useState(false)
  const typeLabel = asset.kind.toUpperCase()
  const sizeLabel = asset.size_bytes
    ? `${(asset.size_bytes / 1024 / 1024).toFixed(2)} MB`
    : "0 MB"

  const handleDownload = async () => {
    if (!asset.location) {
      toast({ title: "Sin archivo", description: "Este asset no tiene una ruta de archivo asociada.", variant: "warning" })
      return
    }
    setDownloading(true)
    try {
      const base64 = await invoke<string>("read_file_base64", { path: asset.location })
      const byteChars = atob(base64)
      const bytes = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
      const blob = new Blob([bytes])
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = asset.name
      a.click()
      URL.revokeObjectURL(url)
      toast({ title: "Descargado", description: asset.name, variant: "success" })
    } catch (err) {
      toast({ title: "Error al descargar", description: `${err}`, variant: "error" })
    } finally {
      setDownloading(false)
    }
  }

  const handleDeleteDoc = async () => {
    const confirmed = window.confirm(`¿Eliminar "${asset.name}"?`)
    if (!confirmed) return
    try {
      await deleteDataAsset(asset.id)
      toast({ title: "Eliminado", description: asset.name, variant: "success" })
      window.location.reload()
    } catch (err) {
      toast({ title: "Error al eliminar", description: `${err}`, variant: "error" })
    }
  }

  return (
    <article className="grid gap-2 px-3 py-2 md:grid-cols-[minmax(0,1fr)_7rem_7rem_6rem_11rem] md:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-background">
            <DocumentAssetIcon kind={typeLabel} className="size-4" />
          </span>
          <h3 className="truncate text-sm font-medium">{asset.name}</h3>
        </div>
        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
          {asset.source} / {sizeLabel}
        </p>
      </div>
      <Pill>{typeLabel}</Pill>
      <DocumentStatus status={asset.status} />
      <div className="text-xs text-muted-foreground md:text-right">
        <span className="font-medium text-foreground">{asset.chunks}</span>{" "}
        chunks
      </div>
      <div className="flex items-center gap-1 justify-end">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Eliminar"
          onClick={handleDeleteDoc}
        >
          <Trash2Icon className="size-3 text-destructive/70 hover:text-destructive" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Descargar"
          disabled={downloading || !asset.location}
          onClick={handleDownload}
        >
          {downloading ? (
            <Loader2Icon className="size-3 animate-spin" />
          ) : (
            <DownloadIcon className="size-3" />
          )}
        </Button>
        <Button
          variant={asset.status === "ready" ? "outline" : "default"}
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          disabled={isIndexing || asset.status === "indexing"}
          onClick={onIndex}
        >
          {isIndexing || asset.status === "indexing" ? (
            <>
              <RefreshCwIcon className="size-3 animate-spin" />
              Indexando
            </>
          ) : asset.status === "ready" ? (
            "Reindexar"
          ) : (
            "Indexar"
          )}
        </Button>
      </div>
    </article>
  )
}

function DocumentsList({
  assets,
  loading,
  indexingAssetId,
  onIndex,
  searchQuery,
  sortBy,
}: DocumentsListProps) {
  const filtered = React.useMemo(() => {
    let list = assets
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.source.toLowerCase().includes(q) ||
          a.kind.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name)
      return b.updated_at - a.updated_at
    })
  }, [assets, searchQuery, sortBy])

  if (loading) {
    return <SkeletonRows />
  }

  if (filtered.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        {searchQuery
          ? "No se encontraron documentos con ese filtro."
          : "No hay documentos registrados. Sincroniza y descarga archivos desde Conectores."}
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {filtered.map((asset) => (
        <DocumentRow
          key={asset.id}
          asset={asset}
          isIndexing={indexingAssetId === asset.id}
          onIndex={() => onIndex(asset.id)}
        />
      ))}
    </div>
  )
}

export { DocumentsList, Metric, DocumentStatus, SkeletonRows }
export type { DocumentsListProps }
