import * as React from "react"
import {
  AlertTriangleIcon,
  BotIcon,
  CheckIcon,
  ChevronRightIcon,
  CpuIcon,
  DownloadIcon,
  ExternalLinkIcon,
  HardDriveIcon,
  HeartIcon,
  LayersIcon,
  SearchIcon,
  ShieldAlertIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react"

import { ModelVariantPicker } from "./ModelVariantPicker"
import { cn } from "@/lib/utils"
import type { HfModelResult, ModelTask, ModelVariant } from "../types"

interface ModelDiscoverListProps {
  models: HfModelResult[]
  loading: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  selectedTask: ModelTask
  onTaskChange: (t: ModelTask) => void
  onSelectModel?: (model: HfModelResult, variant?: ModelVariant) => void
  onDownloadVariant?: (model: HfModelResult, variant: ModelVariant) => void
}

const TASK_TABS: { id: ModelTask; label: string; icon: any }[] = [
  { id: "text-generation", label: "Texto y LLMs", icon: BotIcon },
  { id: "text-to-image", label: "Imágenes y Difusión", icon: SparklesIcon },
  { id: "embeddings", label: "Embeddings / RAG", icon: LayersIcon },
]

export function ModelDiscoverList({
  models,
  loading,
  searchQuery,
  onSearchChange,
  selectedTask,
  onTaskChange,
  onSelectModel,
  onDownloadVariant,
}: ModelDiscoverListProps) {
  const [expandedModelId, setExpandedModelId] = React.useState<string | null>(null)

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Selector de Tarea */}
        <div className="flex items-center gap-1 rounded-2xl border border-border/70 bg-card p-1">
          {TASK_TABS.map((t) => {
            const Icon = t.icon
            const isActive = selectedTask === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTaskChange(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="size-3.5" />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Input de Búsqueda */}
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar en Hugging Face..."
            className="w-full rounded-2xl border border-border/70 bg-card pl-9 pr-4 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-medium"
          />
        </div>
      </div>

      {/* Lista de Modelos */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
            <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground font-medium">Consultando catálogo de Hugging Face y calculando VRAM...</p>
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 py-12 text-center">
            <BotIcon className="size-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs font-bold text-foreground">No se encontraron modelos</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Prueba buscando con otro término o cambiando la categoría.</p>
          </div>
        ) : (
          models.map((model) => {
            const isExpanded = expandedModelId === model.id
            return (
              <div
                key={model.id}
                className="overflow-hidden rounded-3xl border border-border/70 bg-card/90 shadow-2xs transition-all hover:border-border"
              >
                {/* Cabecera del Modelo */}
                <div
                  onClick={() => setExpandedModelId(isExpanded ? null : model.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted/80 text-foreground border border-border/70 shadow-2xs">
                      {selectedTask === "text-to-image" ? (
                        <SparklesIcon className="size-5 text-muted-foreground" />
                      ) : selectedTask === "embeddings" ? (
                        <LayersIcon className="size-5 text-muted-foreground" />
                      ) : (
                        <BotIcon className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground truncate">{model.name}</span>
                        <span className="text-[11px] text-muted-foreground/80 font-mono">@{model.author}</span>
                        {model.has_remote_code && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.2 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                            <ShieldAlertIcon className="size-2.5" />
                            Código Remoto
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap font-medium">
                        <span className="flex items-center gap-1">
                          <DownloadIcon className="size-3 text-muted-foreground/70" />
                          {model.downloads.toLocaleString()} descargas
                        </span>
                        <span className="flex items-center gap-1">
                          <HeartIcon className="size-3 text-rose-500/80" />
                          {model.likes.toLocaleString()}
                        </span>
                        <span className="rounded-full bg-muted/70 px-2 py-0.2 text-[10px] font-mono font-semibold">
                          {model.variants.length} variantes
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`https://huggingface.co/${model.id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Ver en Hugging Face"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <ChevronRightIcon className={cn("size-4 transition-transform", isExpanded && "rotate-90")} />
                    </button>
                  </div>
                </div>

                {/* Variantes Expandibles */}
                {isExpanded && (
                  <div className="border-t border-border/50 bg-muted/10 p-4">
                    <ModelVariantPicker
                      variants={model.variants}
                      onSelectVariant={(variant) => {
                        if (onSelectModel) onSelectModel(model, variant)
                      }}
                      onDownload={(variant) => {
                        if (onDownloadVariant) onDownloadVariant(model, variant)
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
