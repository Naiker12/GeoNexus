import { useEffect, useState } from "react"
import {
  DatabaseIcon,
  FileTextIcon,
  GitBranchIcon,
  LayersIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react"

import { getProjectContext } from "@/api/chat"
import { Button } from "@/components/ui/Button"
import { Switch } from "@/components/ui/switch"
import type { ProjectContext } from "@/types/chat"

type ContextToggle = {
  rag_chunks: boolean
  indexed_assets: boolean
  graph_nodes: boolean
}

type ProjectContextPanelProps = {
  projectId: string
  open: boolean
  onClose: () => void
  toggles: ContextToggle
  onToggleChange: (next: ContextToggle) => void
}

export function ProjectContextPanel({
  projectId,
  open,
  onClose,
  toggles,
  onToggleChange,
}: ProjectContextPanelProps) {
  const [data, setData] = useState<ProjectContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!projectId.trim() || !open) return
    setLoading(true)
    setError("")
    getProjectContext(projectId)
      .then(setData)
      .catch((e) => setError(e?.message ?? String(e)))
      .finally(() => setLoading(false))
  }, [projectId, open])

  return (
    <aside
      data-state={open ? "open" : "closed"}
      className="w-80 shrink-0 border-l border-border bg-background
                 data-[state=closed]:hidden flex flex-col overflow-y-auto"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <LayersIcon className="size-4 text-primary" />
          Contexto del proyecto
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 p-4">
        <ToggleSection
          label="Chunks RAG"
          description="Fragmentos indexados relevantes"
          icon={<DatabaseIcon className="size-4" />}
          checked={toggles.rag_chunks}
          onCheckedChange={(v) =>
            onToggleChange({ ...toggles, rag_chunks: v })
          }
        />
        <ToggleSection
          label="Assets indexados"
          description="Archivos GIS procesados"
          icon={<FileTextIcon className="size-4" />}
          checked={toggles.indexed_assets}
          onCheckedChange={(v) =>
            onToggleChange({ ...toggles, indexed_assets: v })
          }
        />
        <ToggleSection
          label="Conocimiento territorial"
          description="Entidades y relaciones del proyecto"
          icon={<GitBranchIcon className="size-4" />}
          checked={toggles.graph_nodes}
          onCheckedChange={(v) =>
            onToggleChange({ ...toggles, graph_nodes: v })
          }
        />

        <hr className="border-border" />

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-xs text-destructive/80">
            Error al cargar nodos — revisa la conexión
          </p>
        ) : data ? (
          <div className="space-y-3">
            {toggles.indexed_assets && data.assets.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Assets indexados ({data.assets.length})
                </p>
                <div className="space-y-1">
                  {data.assets.map((a) => (
                    <div key={a.name} className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
                      <p className="truncate font-medium">{a.name}</p>
                      <p className="text-muted-foreground">{a.kind}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {toggles.graph_nodes && data.graph_nodes.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Conocimiento territorial ({data.graph_nodes.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {data.graph_nodes.map((n) => (
                    <span
                      key={n.label}
                      className="inline-flex items-center gap-1 rounded-full border
                                 bg-muted/50 px-2.5 py-0.5 text-xs"
                    >
                      {n.label}
                      <span className="text-[10px] text-muted-foreground">
                        {n.kind}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(!data.assets.length && !data.graph_nodes.length) && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No hay datos de contexto indexados para este proyecto.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function ToggleSection({
  label,
  description,
  icon,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  icon: React.ReactNode
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground truncate">
            {description}
          </p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="shrink-0"
      />
    </div>
  )
}

export type { ContextToggle }
