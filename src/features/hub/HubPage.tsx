import { Folder01Icon, Globe02Icon, SparklesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/toast"
import { RemoteCodeConsentDialog } from "@/features/security/RemoteCodeConsentDialog"
import { cn } from "@/lib/utils"
import { deleteHubModel, getHubInventory, searchHfHub } from "./api"
import { ExportStudioModal } from "./components/ExportStudioModal"
import { FreeUpSpaceDialog } from "./components/FreeUpSpaceDialog"
import { ModelDiscoverList } from "./components/ModelDiscoverList"
import { ModelInventoryList } from "./components/ModelInventoryList"
import type { HfModelResult, HubInventoryResult, ModelTask, ModelVariant } from "./types"

export function HubPage() {
  const { toast } = useToast()
  const [tab, setTab] = React.useState<"discover" | "inventory">("discover")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedTask, setSelectedTask] = React.useState<ModelTask>("text-generation")
  const [loading, setLoading] = React.useState(false)
  const [hfModels, setHfModels] = React.useState<HfModelResult[]>([])
  const [inventory, setInventory] = React.useState<HubInventoryResult>({
    models_dir: "",
    total_models: 0,
    total_disk_used_gb: 0,
    total_disk_free_gb: 120,
    models: [],
  })

  const [freeSpaceOpen, setFreeSpaceOpen] = React.useState(false)
  const [exportModalOpen, setExportModalOpen] = React.useState(false)
  const [selectedExportModel, setSelectedExportModel] = React.useState<string>(
    "Qwen/Qwen2.5-Coder-7B-Instruct"
  )
  const [securityDialogOpen, setSecurityDialogOpen] = React.useState(false)
  const [pendingModel, setPendingModel] = React.useState<HfModelResult | null>(null)

  const loadDiscover = React.useCallback(() => {
    setLoading(true)
    searchHfHub(searchQuery, selectedTask)
      .then((res) => setHfModels(res.models))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [searchQuery, selectedTask])

  const loadInventory = React.useCallback(() => {
    getHubInventory().then(setInventory).catch(console.error)
  }, [])

  React.useEffect(() => {
    if (tab === "discover") {
      const timer = setTimeout(() => {
        loadDiscover()
      }, 300)
      return () => clearTimeout(timer)
    }
    loadInventory()
  }, [tab, loadDiscover, loadInventory])

  const handleDeleteModel = async (filename: string) => {
    try {
      await deleteHubModel(filename)
      toast({
        title: "Modelo eliminado",
        description: `Se ha liberado el espacio de ${filename}`,
        variant: "info",
      })
      loadInventory()
    } catch (e) {
      toast({
        title: "Error al eliminar",
        description: String(e),
        variant: "error",
      })
    }
  }

  const handleDeleteSelected = async (filenames: string[]) => {
    for (const fn of filenames) {
      await deleteHubModel(fn).catch(console.error)
    }
    toast({
      title: "Espacio liberado",
      description: `Se eliminaron ${filenames.length} modelos del disco`,
      variant: "success",
    })
    loadInventory()
  }

  const handleDownloadVariant = (model: HfModelResult, variant: ModelVariant) => {
    if (model.has_remote_code) {
      setPendingModel(model)
      setSecurityDialogOpen(true)
      return
    }

    toast({
      title: "Descarga iniciada",
      description: `Descargando ${variant.filename} (~${variant.size_gb} GB)...`,
      variant: "info",
    })
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 [scrollbar-width:thin]">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Cabecera Principal */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl font-sans">
                Hub de Modelos e IA
              </h1>
              <span className="rounded-full bg-primary/10 border border-primary/25 px-2.5 py-0.5 text-xs font-bold text-primary font-mono">
                Hugging Face & VRAM
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xl">
              Descubre, descarga y administra modelos LLMs y difusión con verificación automática de
              compatibilidad en VRAM.
            </p>
          </div>

          {/* Acciones Rápidas y Selector de Pestañas */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedExportModel("Qwen/Qwen2.5-Coder-7B-Instruct")
                setExportModalOpen(true)
              }}
              className="gap-2 text-xs font-mono rounded-2xl border-border/80 hover:border-primary/40 bg-card hover:bg-card/90 shadow-2xs text-foreground cursor-pointer"
            >
              <HugeiconsIcon
                icon={SparklesIcon}
                strokeWidth={1.75}
                className="size-3.5 text-amber-500"
              />
              <span>Export & GGUF</span>
            </Button>

            {/* Selector de Pestañas Principales */}
            <div className="flex items-center gap-1 rounded-2xl border border-border/70 bg-card p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setTab("discover")}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  tab === "discover"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <HugeiconsIcon icon={Globe02Icon} strokeWidth={1.75} className="size-3.5" />
                <span>Explorar Hugging Face</span>
              </button>

              <button
                type="button"
                onClick={() => setTab("inventory")}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  tab === "inventory"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <HugeiconsIcon icon={Folder01Icon} strokeWidth={1.75} className="size-3.5" />
                <span>Inventario Local</span>
                {inventory.total_models > 0 && (
                  <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[9px] font-mono">
                    {inventory.total_models}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Contenido de la pestaña activa */}
        {tab === "discover" ? (
          <ModelDiscoverList
            models={hfModels}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTask={selectedTask}
            onTaskChange={setSelectedTask}
            onDownloadVariant={handleDownloadVariant}
          />
        ) : (
          <ModelInventoryList
            models={inventory.models}
            totalUsedGb={inventory.total_disk_used_gb}
            totalFreeGb={inventory.total_disk_free_gb}
            onDeleteModel={handleDeleteModel}
            onOpenFreeSpaceDialog={() => setFreeSpaceOpen(true)}
          />
        )}
      </div>

      {/* Diálogos Modales */}
      <ExportStudioModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        modelName={selectedExportModel}
      />

      <FreeUpSpaceDialog
        open={freeSpaceOpen}
        onOpenChange={setFreeSpaceOpen}
        models={inventory.models}
        onDeleteSelected={handleDeleteSelected}
      />

      <RemoteCodeConsentDialog
        open={securityDialogOpen}
        onOpenChange={setSecurityDialogOpen}
        modelName={pendingModel?.name || ""}
        onConfirm={() => {
          setSecurityDialogOpen(false)
          if (pendingModel?.variants[0]) {
            handleDownloadVariant(
              { ...pendingModel, has_remote_code: false },
              pendingModel.variants[0]
            )
          }
        }}
      />
    </div>
  )
}
