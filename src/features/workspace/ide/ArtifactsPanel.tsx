import { cn } from "@/lib/utils"
import type { Artifact } from "./ide-types"
import { FileCode, Copy, Download, Eye, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { toast } from "sonner"

interface ArtifactsPanelProps {
  artifacts: Artifact[]
  onViewArtifact: (artifact: Artifact) => void
}

function getArtifactIcon(type: Artifact["type"]) {
  const colors: Record<string, string> = {
    component: "text-blue-500",
    page: "text-green-500",
    style: "text-pink-500",
    config: "text-yellow-500",
    util: "text-purple-500",
  }
  return <FileCode className={cn("size-4", colors[type] ?? "text-muted-foreground")} />
}

function ArtifactCard({ artifact, onView }: { artifact: Artifact; onView: (a: Artifact) => void }) {
  const [copying, setCopying] = useState(false)

  const statusIcon = () => {
    switch (artifact.status) {
      case "generating":
        return <Loader2 className="size-3 animate-spin text-amber-500" />
      case "done":
        return <CheckCircle2 className="size-3 text-emerald-500" />
      case "error":
        return <AlertCircle className="size-3 text-red-500" />
      default:
        return null
    }
  }

  const handleCopy = async () => {
    setCopying(true)
    try {
      toast.success("Copiado al portapapeles")
    } catch {
      toast.error("Error al copiar")
    } finally {
      setCopying(false)
    }
  }

  const handleExport = () => {
    if (artifact.content) {
      const blob = new Blob([artifact.content], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = artifact.name
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Artifact exportado")
    } else {
      toast.error("No hay contenido para exportar")
    }
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted">{getArtifactIcon(artifact.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground truncate">{artifact.name}</h4>
            {statusIcon()}
          </div>
          {artifact.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{artifact.description}</p>
          )}
          <p className="text-xs text-muted-foreground/60 mt-1">{artifact.lineCount} líneas</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onView(artifact)}>
          <Eye className="size-3 mr-1" /> Ver
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleCopy} disabled={copying}>
          <Copy className="size-3 mr-1" />
          {copying ? "Copiado" : "Copiar"}
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleExport}>
          <Download className="size-3 mr-1" /> Exportar
        </Button>
      </div>
    </div>
  )
}

import { useState } from "react"

export function ArtifactsPanel({ artifacts, onViewArtifact }: ArtifactsPanelProps) {
  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Artifacts</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {artifacts.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No hay artifacts generados aún
          </div>
        ) : (
          artifacts.map((artifact) => (
            <ArtifactCard key={artifact.id} artifact={artifact} onView={onViewArtifact} />
          ))
        )}
      </div>
    </div>
  )
}
