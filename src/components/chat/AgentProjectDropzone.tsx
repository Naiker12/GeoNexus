import * as React from "react"
import { Upload, FolderOpen, FileArchive, Loader2 } from "lucide-react"
import { invoke } from "@tauri-apps/api/core"
import { useCodingAgentEvents } from "@/hooks/useCodingAgent"
import { useCodingAgent } from "@/contexts/CodingAgentContext"

export function AgentProjectDropzone() {
  const { loadProject } = useCodingAgentEvents()
  const { state } = useCodingAgent()
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFolderSelect = async () => {
    try {
      const result = await invoke<string | null>("open_folder_picker")
      if (result) {
        setIsLoading(true)
        try {
          await loadProject(result)
        } finally {
          setIsLoading(false)
        }
      }
    } catch {
      // fallback: usar input file si no hay Tauri dialog
      inputRef.current?.click()
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const items = Array.from(e.dataTransfer.items)
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile()
        if (file) {
          setIsLoading(true)
          try {
            if (file.name.endsWith(".zip")) {
              await loadProject(file.name)
            }
          } finally {
            setIsLoading(false)
          }
        }
      }
    }
  }

  if (state.loadedProject) return null

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            setIsLoading(true)
            loadProject(file.name).finally(() => setIsLoading(false))
          }
          e.target.value = ""
        }}
      />
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors cursor-pointer ${
          isDragOver
            ? "border-amber-400 bg-amber-50"
            : "border-muted-foreground/20 hover:border-amber-300 hover:bg-amber-50/30"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={handleFolderSelect}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-6 text-amber-500 animate-spin mb-2" />
            <p className="text-xs text-muted-foreground">Analizando proyecto...</p>
          </>
        ) : (
          <>
            <Upload className="size-6 text-muted-foreground mb-2" />
            <p className="text-xs font-medium text-foreground mb-1">
              Selecciona o arrastra un proyecto
            </p>
            <p className="text-[10px] text-muted-foreground text-center">
              Haz clic para elegir carpeta o arrastra un .zip
            </p>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <FolderOpen className="size-3" /> Carpeta
              </span>
              <span className="inline-flex items-center gap-1">
                <FileArchive className="size-3" /> .zip
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
