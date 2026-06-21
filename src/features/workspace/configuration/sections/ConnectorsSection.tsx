import * as React from "react"
import { Plus, Pencil, Trash2, AlertTriangle, Check, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { listConnectorConfigs } from "@/api/connector"
import type { ConnectorConfig } from "@/types/connector"
import { ConfirmSettingsDialog } from "@/features/workspace/configuration/ConfirmSettingsDialog"

export function ConnectorsSection() {
  const [configs, setConfigs] = React.useState<ConnectorConfig[]>([])
  const [loading, setLoading] = React.useState(true)
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editPath, setEditPath] = React.useState("")

  const loadConfigs = React.useCallback(() => {
    setLoading(true)
    listConnectorConfigs().then((list) => {
      setConfigs(list)
      setLoading(false)
    })
  }, [])

  React.useEffect(() => { loadConfigs() }, [loadConfigs])

  const paths = configs.map(c => c.root_path).filter(Boolean)
  const duplicatePaths = paths.filter((path, i, arr) => arr.indexOf(path) !== i)

  const handleDelete = async (id: string) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      await invoke("delete_connector", { connectorId: id })
      setConfigs(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error("Error al eliminar conector:", err)
    }
    setDeleteConfirm(null)
  }

  const handleStartEdit = (cfg: ConnectorConfig) => {
    setEditingId(cfg.id)
    setEditName(cfg.display_name)
    setEditPath(cfg.root_path ?? "")
  }

  const handleSaveEdit = async (id: string) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core")
      await invoke("update_connector", {
        connectorId: id,
        displayName: editName || null,
        rootPath: editPath || null,
      })
      setConfigs(prev => prev.map(c =>
        c.id === id ? { ...c, display_name: editName || c.display_name, root_path: editPath || c.root_path } : c
      ))
    } catch (err) {
      console.error("Error al actualizar conector:", err)
    }
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
            Conectores IA
          </h3>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Proveedores, servidores MCP y servicios conectados al workspace.
          </p>
        </div>
        <Button variant="outline" size="xs" className="h-7 shrink-0">
          <Plus className="size-3.5 mr-1" /> Añadir conector
        </Button>
      </div>

      {duplicatePaths.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
          <span>Hay conectores con rutas duplicadas. Considera eliminar los redundantes.</span>
        </div>
      )}

      <div className="grid gap-2">
        {loading ? (
          <div className="rounded-lg border border-border bg-card/70 px-3 py-8 text-center text-sm text-muted-foreground">
            Cargando conectores...
          </div>
        ) : configs.length > 0 ? (
          configs.map((cfg) => (
            <article
              key={cfg.id}
              className="rounded-lg border border-border bg-card/70 px-3 py-2.5"
            >
              {editingId === cfg.id ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Nombre del conector"
                    className="text-sm h-8"
                  />
                  <Input
                    value={editPath}
                    onChange={e => setEditPath(e.target.value)}
                    placeholder="Ruta del conector"
                    className="text-sm h-8"
                  />
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(cfg.id)}
                      className="p-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                      title="Guardar"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Cancelar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{cfg.display_name}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          cfg.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {cfg.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>Tipo: {cfg.provider}</span>
                      {cfg.root_path && <span className="truncate">Ruta: {cfg.root_path}</span>}
                      {cfg.base_url && <span className="truncate">URL: {cfg.base_url}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cfg)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Editar conector"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(cfg.id)}
                      className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                      title="Eliminar conector"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-border bg-card/70 px-3 py-8 text-center text-sm text-muted-foreground">
            Sin conectores IA configurados
          </div>
        )}
      </div>

      {deleteConfirm && (
        <ConfirmSettingsDialog
          open
          name={configs.find(c => c.id === deleteConfirm)?.display_name ?? ""}
          isDelete
          description="Esto eliminará el conector de la configuración local. Los archivos en disco no se verán afectados."
          onOpenChange={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm)}
        />
      )}
    </div>
  )
}
