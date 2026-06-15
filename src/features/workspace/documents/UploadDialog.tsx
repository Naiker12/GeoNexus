import * as React from "react"
import { Loader2Icon, UploadCloudIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UploadFilePreviewItem, PendingFileWithPreview } from "./UploadFilePreviewItem"

interface PendingFile {
  file: File
  id: string
}

interface UploadDialogProps {
  open: boolean
  files: PendingFile[]
  onOpenChange: (open: boolean) => void
  onRemoveFile: (id: string) => void
  onUpload: () => Promise<void>
  uploading: boolean
}

function isImage(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp|tiff)$/i.test(file.name)
}

function getPreviewType(file: File): 'image' | 'pdf' | 'shapefile' | 'csv' | 'geojson' | 'document' {
  const name = file.name.toLowerCase()
  if (isImage(file)) return 'image'
  if (name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.shp') || name.endsWith('.zip')) return 'shapefile'
  if (name.endsWith('.csv')) return 'csv'
  if (name.endsWith('.geojson') || name.endsWith('.json')) return 'geojson'
  return 'document'
}

export function UploadDialog({
  open,
  files,
  onOpenChange,
  onRemoveFile,
  onUpload,
  uploading,
}: UploadDialogProps) {
  const [filesWithPreview, setFilesWithPreview] = React.useState<PendingFileWithPreview[]>([])
  const [autoIndex, setAutoIndex] = React.useState(false)

  React.useEffect(() => {
    if (!open) return

    const enriched: PendingFileWithPreview[] = files.map(f => {
      const previewType = getPreviewType(f.file)
      return {
        id: f.id,
        file: f.file,
        previewType,
        previewUrl: previewType === 'image' ? URL.createObjectURL(f.file) : undefined,
      }
    })

    setFilesWithPreview(enriched)

    return () => {
      enriched.forEach(f => {
        if (f.previewUrl) {
          URL.revokeObjectURL(f.previewUrl)
        }
      })
    }
  }, [files, open])

  const totalBytes = files.reduce((sum, f) => sum + f.file.size, 0)
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-96">
        <DialogHeader>
          <DialogTitle>Subir archivos</DialogTitle>
          <DialogDescription>
            {files.length} archivo(s) seleccionados ({formatSize(totalBytes)})
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-1 overflow-auto">
          {filesWithPreview.map((pf) => (
            <UploadFilePreviewItem
              key={pf.id}
              file={pf}
              onRemove={() => onRemoveFile(pf.id)}
              uploading={uploading}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 py-2">
          <input
            type="checkbox"
            id="auto-index"
            checked={autoIndex}
            onChange={(e) => setAutoIndex(e.target.checked)}
            disabled={uploading}
            className="rounded-sm border-border"
          />
          <label htmlFor="auto-index" className="text-sm text-muted-foreground">
            Indexar automáticamente después de subir
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onUpload} disabled={uploading || files.length === 0}>
            {uploading ? (
              <>
                <Loader2Icon className="mr-1 size-3.5 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <UploadCloudIcon className="mr-1 size-3.5" />
                Subir {files.length} archivo(s)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
