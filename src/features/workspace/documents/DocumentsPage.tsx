import * as React from "react"
import { FileTextIcon } from "lucide-react"

import { invoke } from "@tauri-apps/api/core"
import { useToast } from "@/components/ui/toast"
import { DocumentAssetIcon } from "@/features/workspace/documents/DocumentAssetIcon"
import { useDocumentsQuery } from "@/features/workspace/documents/useDocumentsQuery"
import { DocumentsList, Metric } from "@/features/workspace/documents/DocumentsList"
import { DocumentUploader } from "@/features/workspace/documents/DocumentUploader"
import { DocumentFilters, type SortField } from "@/features/workspace/documents/DocumentFilters"
import { FolderPermissionDialog } from "@/features/workspace/documents/FolderPermissionDialog"
import { UploadDialog } from "@/features/workspace/documents/UploadDialog"

export function DocumentsPage() {
  const [permFolder, setPermFolder] = React.useState<{ path: string; name: string } | null>(null)
  const [pendingFiles, setPendingFiles] = React.useState<{ file: File; id: string }[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortBy, setSortBy] = React.useState<SortField>("updated")
  let fileIdCounter = React.useRef(0)
  const { toast } = useToast()

  const {
    assets,
    loading,
    indexingAssetId,
    totalChunks,
    uploadDocument,
    handleChooseFolder,
    handleIndex,
    fetchAssets,
  } = useDocumentsQuery()

  const activeSources = React.useMemo(() => {
    const sources = new Set(assets.map((a) => a.source))
    return sources.size
  }, [assets])

  const handleChooseFolderClick = async () => {
    const folderPath = await invoke<string | null>("open_folder_picker")
    if (!folderPath) return
    const name = folderPath.split("\\").pop()?.split("/").pop() ?? "Carpeta local"
    setPermFolder({ path: folderPath, name })
  }

  const confirmFolderPermissions = async () => {
    if (!permFolder) return
    try {
      const result = await handleChooseFolder(permFolder.path, permFolder.name)
      if (result?.success) {
        toast({ title: `Carpeta "${result.name}" conectada`, description: "Archivos sincronizados correctamente", variant: "success" })
      } else if (result && !result.success) {
        toast({ title: "Error al conectar carpeta", description: result.error, variant: "error" })
      }
    } catch (err) {
      toast({ title: "Error", description: `${err}`, variant: "error" })
    } finally {
      setPermFolder(null)
    }
  }

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
      toast({ title: `${uploaded} archivo(s) subido(s)`, variant: "success" })
    }
    if (failed > 0) {
      toast({ title: `${failed} archivo(s) fallaron`, description: errors.slice(0, 3).join("\n"), variant: "error" })
    }
  }

  const handleIndexWithToast = async (assetId: string) => {
    try {
      await handleIndex(assetId)
      toast({ title: "Documento indexado", variant: "success" })
    } catch (err) {
      toast({ title: "Error al indexar documento", description: String(err).slice(0, 200), variant: "error" })
    }
  }

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto grid w-full max-w-[110rem] gap-3">
        <header className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FileTextIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold tracking-tight">Documentos y fuentes de conocimiento</h1>
                <p className="mt-0.5 max-w-4xl text-sm leading-5 text-muted-foreground">Conecta fuentes desde abajo o usa la barra de busqueda.</p>
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Metric label="Archivos" value={String(assets.length)} />
            <Metric label="Chunks IA" value={String(totalChunks)} />
            <Metric label="Fuentes activas" value={String(activeSources)} />
          </div>
        </header>

        <DocumentUploader
          onChooseFolder={handleChooseFolderClick}
          onFileInput={handleFileInput}
          uploading={uploading}
        />

        <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-1.5 border-b border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Biblioteca documental</h2>
              <p className="text-xs leading-4 text-muted-foreground">Archivos listos para extraccion, chunks y consulta semantica.</p>
            </div>
            <DocumentFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>

          <DocumentsList
            assets={assets}
            loading={loading}
            indexingAssetId={indexingAssetId}
            onIndex={handleIndexWithToast}
            searchQuery={searchQuery}
            sortBy={sortBy}
          />
        </section>
      </div>

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
