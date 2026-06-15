import * as React from "react"
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DocumentAssetIcon } from "@/features/workspace/documents/DocumentAssetIcon"
import { documentSources } from "@/features/workspace/documents/documents-data"
import { useDocuments } from "@/features/workspace/documents/useDocuments"
import { UploadDialog } from "@/features/workspace/documents/UploadDialog"

import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
  ONEDRIVE_CONFIG,
} from "@/config/oauth"
import { cn } from "@/lib/utils"
import type { DataAsset } from "@/types/data"

export function DocumentsPage() {
  const { toast, loading: showLoading, dismiss } = useToast()
  const [oneDriveOpen, setOneDriveOpen] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [permFolder, setPermFolder] = React.useState<{ path: string; name: string } | null>(null)
  const [pendingFiles, setPendingFiles] = React.useState<{ file: File; id: string }[]>([])
  let fileIdCounter = React.useRef(0)

  const {
    assets,
    loading,
    indexingAssetId,
    totalChunks,
    uploadDocument,
    handleChooseFolder,
    handleIndex,
    fetchAssets,
  } = useDocuments()

  const handleChooseFolderClick = async () => {
    const folderPath = await invoke<string | null>("open_folder_picker")
    if (!folderPath) return
    const name = folderPath.split("\\").pop()?.split("/").pop() ?? "Carpeta local"
    setPermFolder({ path: folderPath, name })
  }

  const confirmFolderPermissions = async () => {
    if (!permFolder) return
    const loadingId = showLoading("Conectando carpeta...", `Registrando ${permFolder.name}`)
    try {
      const result = await handleChooseFolder(permFolder.path, permFolder.name)
      if (result?.success) {
        dismiss(loadingId)
        toast({
          title: `Carpeta "${result.name}" conectada`,
          description: "Archivos sincronizados correctamente",
          variant: "success",
        })
      } else if (result && !result.success) {
        dismiss(loadingId)
        toast({
          title: "Error al conectar carpeta",
          description: result.error,
          variant: "error",
        })
      }
    } catch (err) {
      dismiss(loadingId)
      toast({ title: "Error", description: `${err}`, variant: "error" })
    } finally {
      setPermFolder(null)
    }
  }

  const activeSources = React.useMemo(() => {
    const sources = new Set(assets.map((a) => a.source))
    return sources.size
  }, [assets])

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return
    const newFiles = Array.from(files).map((f) => ({
      file: f,
      id: `pf-${++fileIdCounter.current}`,
    }))
    setPendingFiles((prev) => [...prev, ...newFiles])
    event.target.value = ""
  }

  const handleRemovePending = (id: string) => {
    setPendingFiles((prev) => prev.filter((pf) => pf.id !== id))
  }

  const handleUploadConfirmed = async () => {
    if (pendingFiles.length === 0) return
    setUploading(true)
    let uploaded = 0
    let failed = 0
    const errors: string[] = []
    for (const pf of pendingFiles) {
      const result = await uploadDocument(pf.file)
      if (result.success) {
        uploaded++
      } else {
        failed++
        errors.push(`${pf.file.name}: ${result.error}`)
      }
    }
    setUploading(false)
    setPendingFiles([])
    if (uploaded > 0) {
      toast({
        title: `${uploaded} archivo(s) subido(s)`,
        variant: "success",
      })
    }
    if (failed > 0) {
      toast({
        title: `${failed} archivo(s) fallaron`,
        description: errors.slice(0, 3).join("\n"),
        variant: "error",
      })
    }
  }

  const handleIndexWithToast = async (assetId: string) => {
    try {
      await handleIndex(assetId)
      toast({
        title: "Documento indexado",
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Error al indexar documento",
        description: String(err).slice(0, 200),
        variant: "error",
      })
    }
  }

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto grid w-full max-w-[110rem] gap-3">
        <DocumentHeader
          totalFiles={assets.length}
          totalChunks={totalChunks}
          activeSources={activeSources}
        />
        <SourceStrip
          onConnectOneDrive={() => setOneDriveOpen(true)}
          onChooseFolder={handleChooseFolderClick}
          onFileInput={handleFileInput}
          uploading={uploading}
        />

        <DocumentTable
          assets={assets}
          loading={loading}
          indexingAssetId={indexingAssetId}
          onIndex={handleIndexWithToast}
        />
      </div>

      <OneDriveDialog open={oneDriveOpen} onOpenChange={setOneDriveOpen} />
      <FolderPermissionDialog
        open={!!permFolder}
        folderPath={permFolder?.path ?? ""}
        folderName={permFolder?.name ?? ""}
        onConfirm={confirmFolderPermissions}
        onCancel={() => setPermFolder(null)}
      />
      <UploadDialog
        open={pendingFiles.length > 0}
        files={pendingFiles}
        onOpenChange={(open) => { if (!open) setPendingFiles([]) }}
        onRemoveFile={handleRemovePending}
        onUpload={handleUploadConfirmed}
        uploading={uploading}
      />
    </section>
  )
}

function DocumentHeader({
  totalFiles,
  totalChunks,
  activeSources,
}: {
  totalFiles: number
  totalChunks: number
  activeSources: number
}) {
  return (
    <header className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileTextIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">
              Documentos y fuentes de conocimiento
            </h1>
            <p className="mt-0.5 max-w-4xl text-sm leading-5 text-muted-foreground">
              Conecta fuentes desde abajo o usa la barra de busqueda.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Metric label="Archivos" value={String(totalFiles)} />
        <Metric label="Chunks IA" value={String(totalChunks)} />
        <Metric label="Fuentes activas" value={String(activeSources)} />
      </div>
    </header>
  )
}

function SourceStrip({
  onConnectOneDrive,
  onChooseFolder,
  onFileInput,
  uploading,
}: {
  onConnectOneDrive: () => void
  onChooseFolder: () => void
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploading: boolean
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleAction = (name: string) => {
    switch (name) {
      case "OneDrive":
        onConnectOneDrive()
        break
      case "Carpeta Windows":
        onChooseFolder()
        break
      case "Subir archivos":
        fileInputRef.current?.click()
        break
      case "URL / SharePoint":
        alert("Funcionalidad proximamente")
        break
    }
  }

  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Fuentes conectables</h2>
          <p className="text-xs text-muted-foreground">
            Cada fuente alimenta el mismo pipeline de extraccion, memoria y chat.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Actualizar fuentes"
          onClick={() => window.location.reload()}
        >
          <RefreshCwIcon className="size-3.5" />
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {documentSources.map((source) => {
          const isOneDrive = source.name === "OneDrive"
          const actionLabel =
            source.name === "OneDrive"
              ? "Conectar"
              : source.name === "Carpeta Windows"
                ? "Elegir"
                : source.name === "Subir archivos"
                  ? uploading ? "Subiendo..." : "Subir"
                  : "Agregar URL"

          return (
            <div
              key={source.name}
              className="flex min-h-24 w-full items-start gap-3 rounded-md border border-border bg-background/75 p-3 text-left"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <DocumentAssetIcon
                  kind={source.name}
                  variant="source"
                  className="size-4"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {source.name}
                </span>
                <span className="mt-1 block line-clamp-2 text-xs leading-4 text-muted-foreground">
                  {source.detail}
                </span>
                <span className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[0.68rem] text-muted-foreground">
                    {source.status}
                  </span>
                  <Button
                    variant={isOneDrive ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleAction(source.name)}
                    disabled={uploading && source.name === "Subir archivos"}
                  >
                    {actionLabel}
                  </Button>
                </span>
              </span>
            </div>
          )
        })}
      </div>

      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept=".pdf,.doc,.docx,.txt,.zip,.dxf,.geojson,.shp,.csv,.xlsx,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff"
        multiple
        onChange={onFileInput}
      />
    </section>
  )
}

function DocumentTable({
  assets,
  loading,
  indexingAssetId,
  onIndex,
}: {
  assets: DataAsset[]
  loading: boolean
  indexingAssetId: string | null
  onIndex: (id: string) => void
}) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<"name" | "updated">("updated")

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

  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-1.5 border-b border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Biblioteca documental</h2>
          <p className="text-xs leading-4 text-muted-foreground">
            Archivos listos para extraccion, chunks y consulta semantica.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar documentos..."
            className="h-7 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-primary/50 w-40"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "updated")}
            className="h-7 rounded-md border border-border bg-background px-1 text-xs outline-none"
          >
            <option value="updated">Reciente</option>
            <option value="name">Nombre</option>
          </select>
        </div>
      </div>

      {loading ? (
        <SkeletonRows />
      ) : filtered.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          {searchQuery
            ? "No se encontraron documentos con ese filtro."
            : "No hay documentos registrados. Sincroniza y descarga archivos desde Conectores."}
        </div>
      ) : (
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
      )}
    </section>
  )
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

function OneDriveDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const [connecting, setConnecting] = React.useState(false)

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener")
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)
      const authUrl = buildAuthUrl(ONEDRIVE_CONFIG, challenge)
      await openUrl(authUrl)
      toast({
        title: "Navegador abierto",
        description: "Completa el inicio de sesion en el navegador.",
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: `No se pudo abrir el navegador: ${err}`,
        variant: "error",
      })
    } finally {
      setConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(88vw,24rem)] rounded-lg p-0">
        <DialogHeader className="mb-0 border-b border-border px-3 pb-2 pt-3">
          <div className="flex items-center gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <DocumentAssetIcon kind="OneDrive" variant="source" className="size-3.5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm">Conectar OneDrive</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 p-4">
          <div className="flex size-14 items-center justify-center rounded-2xl border-2 border-border bg-primary/5">
            <DocumentAssetIcon kind="OneDrive" variant="source" className="size-7" />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Te enviaremos al navegador para iniciar sesion con tu cuenta Microsoft.
          </p>
          <Button
            size="sm"
            className="w-full gap-1.5"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ExternalLinkIcon className="size-4" />
            )}
            {connecting ? "Abriendo..." : "Continuar con Microsoft"}
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => onOpenChange(false)} className="-mt-1 h-7 text-xs">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FolderPermissionDialog({
  open,
  folderPath,
  folderName,
  onConfirm,
  onCancel,
}: {
  open: boolean
  folderPath: string
  folderName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="w-[min(88vw,28rem)] rounded-lg p-0">
        <DialogHeader className="px-4 pb-3 pt-4 border-b border-border">
          <DialogTitle className="text-sm">Permisos de carpeta</DialogTitle>
          <DialogDescription className="mt-1 text-xs">
            Geo Agents necesita los siguientes permisos sobre:
            <code className="mt-1 block rounded bg-muted px-2 py-1 text-xs font-mono">{folderPath}</code>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 p-4">
          <ul className="grid gap-2 text-xs">
            {[
              ["Lectura", "Leer archivos PDF, DOCX, GeoJSON, SHP y mas formatos"],
              ["Indexacion", "Extraer texto, crear chunks y generar embeddings"],
              ["Cache local", "Copiar archivos al cache interno de Geo Agents"],
              ["Grafo", "Vincular entidades y relaciones en el grafo de conocimiento"],
            ].map(([title, desc]) => (
              <li key={title} className="flex items-start gap-2 rounded-md border border-border bg-background/60 px-2.5 py-2">
                <CheckCircle2Icon className="size-3.5 shrink-0 mt-0.5 text-primary" />
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-muted-foreground">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            No se modificaran tus archivos originales. Los chunks y embeddings se almacenan en la base de datos local.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
            <Button size="sm" onClick={onConfirm}>Conceder permisos</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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


