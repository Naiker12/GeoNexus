import * as React from "react"
import { X, Zap, FileWarning, FolderOpen, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCodingAgent } from "@/contexts/CodingAgentContext"
import { AgentFileTree } from "./AgentFileTree"
import { AgentPreview } from "./AgentPreview"
import { AgentProjectDropzone } from "./AgentProjectDropzone"

type CodingAgentPanelProps = {
  onApprovePlan: (plan: import("@/types/coding-agent").AgentPlan) => Promise<void>
  onRejectPlan: () => void
  onEditPlan: (instructions: string) => Promise<void>
  onResolvePermission: (requestId: string, granted: boolean) => Promise<void>
  onReset: () => void
}

export function CodingAgentPanel(props: CodingAgentPanelProps) {
  const { state, dispatch } = useCodingAgent()
  const approvePlan = props.onApprovePlan
  const rejectPlan = props.onRejectPlan
  const editPlan = props.onEditPlan
  const resolvePermission = props.onResolvePermission
  const reset = props.onReset
  const [activeTab, setActiveTab] = React.useState("files")
  const [editInstructions, setEditInstructions] = React.useState("")
  const [showEditInput, setShowEditInput] = React.useState(false)
  const [selectedFiles, setSelectedFiles] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    if (state.currentPlan) {
      setSelectedFiles(new Set(state.currentPlan.files.filter((f) => f.risk !== "high").map((f) => f.path)))
    }
  }, [state.currentPlan])

  if (state.mode !== "agent") return null

  const isNewProject = !state.loadedProject

  return (
    <div className="w-full min-w-[380px] max-w-[480px] border-l border-border bg-background flex flex-col animate-in slide-in-from-right">
      {/* Permission banner */}
      {state.pendingPermissions.length > 0 && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2">
          {state.pendingPermissions.map((perm) => (
            <div key={perm.id} className="flex items-center gap-2 text-xs text-amber-800 mb-1 last:mb-0">
              <FileWarning className="size-3.5 shrink-0 text-amber-600" />
              <span className="flex-1">
                El agente quiere <strong>{perm.action === "overwrite" ? "sobrescribir" : perm.action === "delete" ? "eliminar" : "escribir fuera de"}</strong>{" "}
                <code className="bg-amber-100 px-1 rounded">{perm.targetPath}</code>
                {perm.reason && <span className="block text-amber-600">— {perm.reason}</span>}
              </span>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={() => resolvePermission(perm.id, true)}
                >
                  <CheckCircle2 className="size-3 mr-1" />
                  Permitir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => resolvePermission(perm.id, false)}
                >
                  <XCircle className="size-3 mr-1" />
                  Denegar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-amber-50/30">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight">
                Agente
              </h2>
              {state.loadedProject && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 truncate max-w-[140px]">
                  <FolderOpen className="size-3 shrink-0" />
                  <span className="truncate">{state.loadedProject.name}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              {state.status === "planning_review" ? "Plan listo para revisar" : state.status === "thinking" ? "Analizando..." : state.status === "planning" ? "Planificando..." : state.status === "coding" ? "Escribiendo archivos..." : state.status === "done" ? "Completado" : state.status === "error" ? "Error" : "Inactivo"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={reset}
            title="Reiniciar agente"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => dispatch({ type: "SET_MODE", payload: "chat" })}
            title="Cerrar panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Plan review */}
      {state.currentPlan && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50/60 px-4 py-3">
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-2">
            Plan propuesto
          </p>
          <p className="text-xs text-amber-900/80 mb-2">{state.currentPlan.summary}</p>
          <ul className="space-y-1 mb-3">
            {state.currentPlan.files.map((f, i) => {
              const checked = selectedFiles.has(f.path)
              return (
                <li key={i} className="flex items-center gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    className="size-3 accent-amber-600 shrink-0"
                    checked={checked}
                    onChange={() => {
                      const next = new Set(selectedFiles)
                      if (checked) { next.delete(f.path) } else { next.add(f.path) }
                      setSelectedFiles(next)
                    }}
                  />
                  <span className={`size-1.5 rounded-full shrink-0 ${f.risk === "high" ? "bg-red-400" : "bg-emerald-400"}`} />
                  <code className="text-amber-800 bg-amber-100/70 px-1 rounded truncate">{f.path}</code>
                  <span className="text-amber-600 truncate">{f.shortDescription}</span>
                  {f.risk === "high" && (
                    <span
                      className="text-[10px] text-red-500 font-medium shrink-0 cursor-help"
                      title={f.reason || "Este archivo ya existe y será sobrescrito"}
                    >
                      ⚠ requiere aprobación
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          {!showEditInput ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={selectedFiles.size === 0}
                onClick={() => {
                  const filteredPlan = {
                    ...state.currentPlan!,
                    files: state.currentPlan!.files.filter((f) => selectedFiles.has(f.path)),
                  }
                  approvePlan(filteredPlan)
                }}
              >
                <CheckCircle2 className="size-3 mr-1" />
                Aprobar ({selectedFiles.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowEditInput(true)}
              >
                Editar instrucciones
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={rejectPlan}
              >
                <XCircle className="size-3 mr-1" />
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                className="w-full text-xs border border-amber-200 rounded-md p-2 bg-white resize-none"
                rows={3}
                placeholder="Describe cambios al plan..."
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!editInstructions.trim()}
                  onClick={() => {
                    editPlan(editInstructions)
                    setEditInstructions("")
                    setShowEditInput(false)
                  }}
                >
                  Re-generar plan
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowEditInput(false)
                    setEditInstructions("")
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dropzone for new projects */}
      {isNewProject && state.status === "idle" && (
        <div className="shrink-0 border-b px-4 py-3">
          <AgentProjectDropzone />
        </div>
      )}

      {/* Tabs — solo Archivos y Preview; el timeline está en el chat */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
          <TabsTrigger value="files" className="text-xs">
            Archivos
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-xs">
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="files"
          className="flex-1 min-h-0 overflow-y-auto m-0 p-0"
        >
          {state.currentPlan && (
            <div className="border-b border-amber-200/30 bg-amber-50/30 px-4 py-2">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">
                Plan
              </p>
              <p className="text-xs text-amber-900/80 mb-1">{state.currentPlan.summary}</p>
              <ul className="space-y-0.5">
                {state.currentPlan.files.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[10px] text-amber-700">
                    <span className={`size-1.5 rounded-full shrink-0 ${f.risk === "high" ? "bg-red-400" : "bg-emerald-400"}`} />
                    <code className="bg-amber-100/70 px-1 rounded truncate">{f.path}</code>
                    <span className="truncate text-amber-600">{f.shortDescription}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {state.files.length === 0 && !state.loadedProject ? (
            <div className="p-4">
              <AgentProjectDropzone />
            </div>
          ) : (
            <AgentFileTree
              files={state.files}
              activeFile={state.activeFile}
              onFileSelect={(file) =>
                dispatch({ type: "SET_ACTIVE_FILE", payload: file })
              }
            />
          )}
        </TabsContent>

        <TabsContent
          value="preview"
          className="flex-1 overflow-hidden m-0 p-0"
        >
          <AgentPreview
            previewUrl={state.previewUrl}
            onRefresh={() => {
              if (state.previewUrl) {
                dispatch({ type: "SET_PREVIEW_URL", payload: null })
                setTimeout(() => {
                  dispatch({
                    type: "SET_PREVIEW_URL",
                    payload: state.previewUrl,
                  })
                }, 50)
              }
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Cleanup report button */}
      {state.cleanupReport && (
        <div className="shrink-0 border-t bg-muted/20 px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => setActiveTab("files")}
          >
            Ver reporte de limpieza ({state.cleanupReport.removedFiles} archivos)
          </Button>
        </div>
      )}
    </div>
  )
}
