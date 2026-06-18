import * as React from "react"
import { File } from "lucide-react"
import type { FileNode } from "@/types/coding-agent"

interface AgentCodeViewerProps {
  file: FileNode | null
}

export function AgentCodeViewer({ file }: AgentCodeViewerProps) {
  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <File className="size-10 mb-3 opacity-30" />
        <p className="text-sm text-center">Selecciona un archivo para ver su contenido</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 border-b bg-muted/30 px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {file.path}
        </span>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <pre className="text-xs leading-relaxed text-foreground font-mono whitespace-pre-wrap">
          {(file as any).content ?? "// Sin contenido disponible"}
        </pre>
      </div>
    </div>
  )
}
