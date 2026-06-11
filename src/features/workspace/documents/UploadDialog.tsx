import * as React from "react"
import { FileTextIcon, XCircleIcon, Loader2Icon, UploadCloudIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

export function UploadDialog({
  open,
  files,
  onOpenChange,
  onRemoveFile,
  onUpload,
  uploading,
}: UploadDialogProps) {
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
          {files.map((pf) => (
            <div
              key={pf.id}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5 text-sm"
            >
              <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{pf.file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatSize(pf.file.size)}
              </span>
              {!uploading && (
                <button
                  onClick={() => onRemoveFile(pf.id)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Quitar ${pf.file.name}`}
                >
                  <XCircleIcon className="size-4" />
                </button>
              )}
            </div>
          ))}
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
