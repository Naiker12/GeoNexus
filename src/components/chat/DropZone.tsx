import * as React from "react"
import { cn } from "@/lib/utils"

interface DropZoneProps {
  onDrop: (files: File[]) => void
  children: React.ReactNode
  className?: string
}

export function DropZone({ onDrop, children, className }: DropZoneProps) {
  const [isDragging, setIsDragging] = React.useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files || [])
    if (files.length > 0) {
      onDrop(files)
    }
  }

  return (
    <div
      className={cn("relative", className)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl">⬇️</span>
            <p className="font-medium text-primary">Suelta aquí para adjuntar</p>
            <p className="text-sm text-muted-foreground">
              Imágenes · PDF · Shapefiles (ZIP) · GeoJSON · CSV
            </p>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}