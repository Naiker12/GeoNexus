import * as React from "react"
import {
  ClockIcon,
  CpuIcon,
  FileCodeIcon,
  FolderIcon,
  HardDriveIcon,
  PlayIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import type { LocalModelItem } from "../types"

interface ModelInventoryListProps {
  models: LocalModelItem[]
  totalUsedGb: number
  totalFreeGb: number
  onDeleteModel: (filename: string) => void
  onLoadModel?: (model: LocalModelItem) => void
  onOpenFreeSpaceDialog: () => void
}

export function ModelInventoryList({
  models,
  totalUsedGb,
  totalFreeGb,
  onDeleteModel,
  onLoadModel,
  onOpenFreeSpaceDialog,
}: ModelInventoryListProps) {
  const diskTotal = totalUsedGb + totalFreeGb
  const usedPercent = diskTotal > 0 ? Math.min(100, Math.round((totalUsedGb / diskTotal) * 100)) : 0

  return (
    <div className="space-y-4">
      {/* Tarjeta de Almacenamiento en Disco */}
      <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <HardDriveIcon className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground">Almacenamiento Local de Modelos</span>
                <span className="rounded-full bg-muted/60 px-2 py-0.2 text-[10px] font-mono text-muted-foreground">
                  {models.length} modelos
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Ocupando <strong className="text-foreground">{totalUsedGb} GB</strong> de {Math.round(diskTotal)} GB totales ({totalFreeGb} GB libres)
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFreeSpaceDialog}
            className="rounded-xl text-xs gap-1.5 h-8 border-border/70 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          >
            <Trash2Icon className="size-3.5" />
            <span>Liberar Espacio</span>
          </Button>
        </div>

        {/* Barra de progreso de disco */}
        <div className="mt-3.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${Math.max(4, usedPercent)}%` }}
          />
        </div>
      </div>

      {/* Lista de Modelos en Disco */}
      <div className="space-y-2.5">
        {models.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 py-12 text-center">
            <FolderIcon className="size-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs font-medium text-foreground">No tienes modelos descargados</p>
            <p className="text-[11px] text-muted-foreground">
              Explora la pestaña "Explorar Hugging Face" para descargar modelos GGUF o Safetensors.
            </p>
          </div>
        ) : (
          models.map((model) => (
            <div
              key={model.path}
              className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/90 p-3.5 shadow-xs hover:border-border transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <FileCodeIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground truncate">{model.name}</span>
                    <span className="rounded-md bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 text-[9px] font-mono uppercase font-bold">
                      {model.format}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{model.size_gb} GB</span>
                    <span>•</span>
                    <span className="truncate max-w-xs">{model.path}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {onLoadModel && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => onLoadModel(model)}
                    className="rounded-xl text-xs gap-1 h-7 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    <PlayIcon className="size-3" />
                    <span>Cargar</span>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDeleteModel(model.filename)}
                  className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Eliminar de disco"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
