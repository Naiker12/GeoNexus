import * as React from "react"
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  FileIcon,
  FolderOpenIcon,
  Loader2Icon,
  MapPinIcon,
  RouteIcon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import type { MentionableSourceItem } from "@/types/chat"
import { invoke } from "@tauri-apps/api/core"

type DirEntry = {
  name: string
  path: string
  is_dir: boolean
  size_bytes: number | null
}

type Props = {
  connector: MentionableSourceItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnected: () => void
}

const SHP_EXTS = ["shp"]

export function ShapefileConnectorDialog({
  connector,
  open,
  onOpenChange,
  onConnected,
}: Props) {
  const { toast } = useToast()

  const [folderPath, setFolderPath] = React.useState("")
  const [files, setFiles] = React.useState<DirEntry[]>([])
  const [loading, setLoading] = React.useState(false)
  const [scanning, setScanning] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<DirEntry | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [step, setStep] = React.useState<"pick" | "select" | "done">("pick")

  React.useEffect(() => {
    if (!open) {
      setFolderPath("")
      setFiles([])
      setSelectedFile(null)
      setLoading(false)
      setScanning(false)
      setUploading(false)
      setStep("pick")
    }
  }, [open])

  const pickFolder = async () => {
    try {
      const folder = await invoke<string | null>("open_folder_picker")
      if (folder) {
        setFolderPath(folder)
        await scanFolder(folder)
      }
    } catch (err) {
      toast({ title: "Error", description: `No se pudo abrir el selector: ${err}`, variant: "error" })
    }
  }

  const scanFolder = async (path: string) => {
    setScanning(true)
    setFiles([])
    setSelectedFile(null)
    try {
      const entries = await invoke<DirEntry[]>("list_directory", {
        path,
        includeExtensions: SHP_EXTS,
      })
      setFiles(entries)
      setStep(entries.length > 0 ? "select" : "pick")
      if (entries.length === 0) {
        toast({
          title: "Sin archivos shapefile",
          description: "No se encontraron archivos .shp en esta carpeta.",
          variant: "warning",
        })
      }
    } catch (err) {
      toast({ title: "Error al escanear", description: `${err}`, variant: "error" })
    } finally {
      setScanning(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !folderPath) return
    setUploading(true)
    try {
      const base64 = await invoke<string>("read_file_base64", {
        path: selectedFile.path,
      })

      const binaryStr = atob(base64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }

      const connectorId = `shapefile-${connector.id}-${Date.now()}`
      const assetId = await invoke<string>("upload_asset_file", {
        projectId: "project-default",
        workspaceId: "workspace-main",
        connectorId,
        fileName: selectedFile.name,
        bytes: Array.from(bytes),
      })

      await invoke<number>("index_document", {
        documentId: assetId,
      })

      toast({
        title: "Shapefile indexado",
        description: `${selectedFile.name} fue subido e indexado correctamente.`,
        variant: "success",
      })
      setStep("done")
    } catch (err) {
      toast({ title: "Error al procesar", description: `${err}`, variant: "error" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[calc(50%+1rem)] flex max-h-[min(90svh,36rem)] w-[min(94vw,42rem)] flex-col overflow-hidden rounded-lg p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
              <MapPinIcon className="size-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">Conectar Shapefile</DialogTitle>
              <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                Escanea una carpeta local en busca de archivos .shp, selecciona uno y lo indexa en Geo Agents.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4 pt-3 [scrollbar-width:thin]">
          {step === "pick" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex size-16 items-center justify-center rounded-2xl border-2 border-amber-500/20 bg-amber-500/10">
                <FolderOpenIcon className="size-8 text-amber-500" />
              </div>
              <p className="text-center text-sm text-muted-foreground max-w-xs">
                Selecciona una carpeta que contenga archivos shapefile (.shp) para escanear.
              </p>
              <Button size="lg" className="gap-2" onClick={pickFolder} disabled={scanning}>
                {scanning ? (
                  <Loader2Icon className="size-5 animate-spin" />
                ) : (
                  <FolderOpenIcon className="size-5" />
                )}
                {scanning ? "Escaneando..." : "Seleccionar carpeta"}
              </Button>
              {folderPath && scanning && (
                <p className="text-xs text-muted-foreground">Escaneando: {folderPath}</p>
              )}
            </div>
          )}

          {step === "select" && (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <FolderOpenIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate text-muted-foreground">{folderPath}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto shrink-0 h-7 gap-1.5 text-xs"
                  onClick={pickFolder}
                >
                  <SearchIcon className="size-3.5" />
                  Cambiar
                </Button>
              </div>

              <div className="text-sm font-medium text-muted-foreground">
                {files.length} archivo{files.length !== 1 ? "s" : ""} .shp encontrado{files.length !== 1 ? "s" : ""}
              </div>

              <div className="grid gap-1.5">
                {files.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    disabled={uploading}
                    onClick={() => setSelectedFile(file)}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                      selectedFile?.path === file.path
                        ? "border-amber-500/50 bg-amber-500/10"
                        : "border-border bg-background hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className={`flex size-8 items-center justify-center rounded-md border ${
                      selectedFile?.path === file.path
                        ? "border-amber-500/30 bg-amber-500/15"
                        : "border-border bg-muted/40"
                    }`}>
                      <FileIcon className={`size-4 ${
                        selectedFile?.path === file.path ? "text-amber-500" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{file.name}</p>
                      {file.size_bytes != null && (
                        <p className="text-xs text-muted-foreground">
                          {formatSize(file.size_bytes)}
                        </p>
                      )}
                    </div>
                    {selectedFile?.path === file.path && (
                      <CheckCircle2Icon className="size-5 shrink-0 text-amber-500" />
                    )}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <RouteIcon className="size-3.5 text-primary" />
                  Flujo
                </div>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  Se leerá el archivo, se subirá al gestor de activos y se indexará
                  mediante el extractor GIS para generar embeddings y nodos de conocimiento.
                </p>
              </div>
            </>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex size-16 items-center justify-center rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/10">
                <CheckCircle2Icon className="size-8 text-emerald-500" />
              </div>
              <p className="text-center text-sm font-medium">
                Shapefile indexado correctamente
              </p>
              <p className="text-center text-xs text-muted-foreground max-w-xs">
                {selectedFile?.name} ya está disponible en Geo Agents para consultas y análisis.
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3 flex items-center justify-end gap-2 bg-muted/20">
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
            {step === "done" ? "Cerrar" : "Cancelar"}
          </Button>
          {step === "select" && (
            <Button
              size="sm"
              className="gap-2"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <ExternalLinkIcon className="size-4" />
              )}
              {uploading ? "Subiendo e indexando..." : "Subir e indexar"}
            </Button>
          )}
          {step === "done" && (
            <Button size="sm" onClick={() => { onConnected(); onOpenChange(false) }}>
              Continuar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
