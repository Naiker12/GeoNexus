import * as React from "react"

type UseFileDropOptions = {
  onFiles: (files: File[]) => void
  accept?: string[]
}

type UseFileDropReturn = {
  isDragging: boolean
  dragHandlers: {
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
}

function useFileDrop({ onFiles, accept }: UseFileDropOptions): UseFileDropReturn {
  const [isDragging, setIsDragging] = React.useState(false)
  const dragCounter = React.useRef(0)

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragging(false)
    }
  }, [])

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0

    const files = Array.from(e.dataTransfer.files || [])
    if (files.length === 0) return

    const filtered = accept
      ? files.filter((f) => accept.some((ext) => f.name.toLowerCase().endsWith(ext)))
      : files

    if (filtered.length > 0) {
      onFiles(filtered)
    }
  }, [onFiles, accept])

  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    if (!isDragging) {
      setIsDragging(true)
    }
  }, [isDragging])

  return {
    isDragging,
    dragHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  }
}

export { useFileDrop }
export type { UseFileDropOptions, UseFileDropReturn }
