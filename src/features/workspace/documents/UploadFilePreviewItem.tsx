import * as React from "react"
import {
  FileTextIcon,
  XCircleIcon,
  ImageIcon,
  MapIcon,
  TableIcon,
  FileJsonIcon,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"

export interface PendingFileWithPreview {
  id: string
  file: File
  previewUrl?: string
  previewType: 'image' | 'pdf' | 'shapefile' | 'csv' | 'geojson' | 'document'
  progress?: number
}

interface UploadFilePreviewItemProps {
  file: PendingFileWithPreview
  onRemove: () => void
  uploading: boolean
}

export function UploadFilePreviewItem({ file, onRemove, uploading }: UploadFilePreviewItemProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getIconForType = () => {
    switch (file.previewType) {
      case 'image':
        return <ImageIcon className="size-5 text-muted-foreground" />
      case 'pdf':
        return <FileTextIcon className="size-5 text-muted-foreground" />
      case 'shapefile':
        return <MapIcon className="size-5 text-muted-foreground" />
      case 'csv':
        return <TableIcon className="size-5 text-muted-foreground" />
      case 'geojson':
        return <FileJsonIcon className="size-5 text-muted-foreground" />
      default:
        return <FileTextIcon className="size-5 text-muted-foreground" />
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5 text-sm">
      <div className="shrink-0">
        {file.previewType === 'image' && file.previewUrl ? (
          <img
            src={file.previewUrl}
            alt={file.file.name}
            className="w-10 h-10 object-cover rounded-md"
          />
        ) : (
          getIconForType()
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <span className="truncate">{file.file.name}</span>
        <span className="text-xs text-muted-foreground">
          {formatFileSize(file.file.size)}
        </span>
        {file.progress !== undefined && (
          <div className="w-full">
            <Progress value={file.progress} className="h-1" />
          </div>
        )}
      </div>
      {!uploading && (
        <button
          onClick={onRemove}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={`Quitar ${file.file.name}`}
        >
          <XCircleIcon className="size-4" />
        </button>
      )}
    </div>
  )
}