import * as React from "react"
import { Upload, FolderOpen, FileArchive, Loader2 } from "lucide-react"
import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { useCodingAgentEvents } from "@/hooks/useCodingAgent"
import { useCodingAgent } from "@/contexts/CodingAgentContext"

export function AgentProjectDropzone() {
  const { loadProject } = useCodingAgentEvents()
  const { state } = useCodingAgent()
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    let cancelled = false
    const unlisteners: UnlistenFn[] = []

    const setup = async () => {
      const uEnter = await listen<{ paths: string[]; position: { x: number; y: number } }>(
        "tauri://drag-enter",
        (event) => {
          if (!cancelled) setIsDragOver(true)
        },
      )
      unlisteners.push(uEnter)

      const uOver = await listen<{ position: { x: number; y: number } }>(
        "tauri://drag-over",
        () => {},
      )
      unlisteners.push(uOver)

      const uDrop = await listen<{ paths: string[]; position: { x: number; y: number } }>(
        "tauri://drag-drop",
        (event) => {
          if (!cancelled) {
            setIsDragOver(false)
            const path = event.payload.paths?.[0]
            if (path) {
              setIsLoading(true)
              loadProject(path).finally(() => setIsLoading(false))
            }
          }
        },
      )
      unlisteners.push(uDrop)

      const uLeave = await listen<void>(
        "tauri://drag-leave",
        () => {
          if (!cancelled) setIsDragOver(false)
        },
      )
      unlisteners.push(uLeave)
    }

    setup()

    return () => {
      cancelled = true
      unlisteners.forEach((fn) => fn())
    }
  }, [loadProject])

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
      inputRef.current?.click()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
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
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all duration-200 cursor-pointer ${
          isDragOver
            ? "border-amber-400 bg-amber-50 scale-[1.02]"
            : "border-muted-foreground/20 hover:border-amber-300 hover:bg-amber-50/30"
        } ${isLoading ? "pointer-events-none" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={handleFolderSelect}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-8 text-amber-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-amber-700">Analizando proyecto...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Detectando estructura y lenguajes
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center size-12 rounded-full bg-amber-50 border border-amber-200 mb-3">
              <Upload className="size-6 text-amber-500" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              Arrastra un proyecto aquí
            </p>
            <p className="text-xs text-muted-foreground text-center mb-3">
              o haz clic para seleccionar una carpeta
            </p>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                <FolderOpen className="size-3.5" /> Carpeta
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                <FileArchive className="size-3.5" /> .zip
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
