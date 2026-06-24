import * as React from "react"
import { UploadIcon, FileIcon } from "lucide-react"

export function DragDropOverlay() {
  const [dragging, setDragging] = React.useState(false)
  const [fileCount, setFileCount] = React.useState(0)
  const dragCounter = React.useRef(0)

  const handleDragEnter = React.useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer?.types.includes("Files")) {
      setDragging(true)
      setFileCount(e.dataTransfer.files.length)
    }
  }, [])

  const handleDragLeave = React.useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setDragging(false)
    }
  }, [])

  const handleDragOver = React.useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = React.useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setDragging(false)
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      window.dispatchEvent(new CustomEvent("geonexus:global-drop-files", { detail: Array.from(files) }))
    }
  }, [])

  React.useEffect(() => {
    document.addEventListener("dragenter", handleDragEnter)
    document.addEventListener("dragleave", handleDragLeave)
    document.addEventListener("dragover", handleDragOver)
    document.addEventListener("drop", handleDrop)
    return () => {
      document.removeEventListener("dragenter", handleDragEnter)
      document.removeEventListener("dragleave", handleDragLeave)
      document.removeEventListener("dragover", handleDragOver)
      document.removeEventListener("drop", handleDrop)
    }
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop])

  if (!dragging) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/50 bg-card/90 px-10 py-12 shadow-lg">
        <UploadIcon className="size-10 text-primary/60" />
        <p className="text-lg font-semibold text-foreground">Suelta los archivos aquí</p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <FileIcon className="size-4" />
          {fileCount === 1 ? "1 archivo listo" : `${fileCount} archivos listos`}
        </p>
      </div>
    </div>
  )
}
