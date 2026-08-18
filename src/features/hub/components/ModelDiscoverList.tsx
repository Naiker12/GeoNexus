import {
  ArrowDown01Icon,
  Brain02Icon,
  Cancel01Icon,
  Copy01Icon,
  DatabaseIcon,
  Download01Icon,
  FavouriteIcon,
  Image01Icon,
  LinkSquare02Icon,
  Search01Icon,
  SparklesIcon,
  Tick02Icon,
  ZapIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import type { HfModelResult, ModelTask, ModelVariant } from "../types"
import { ModelVariantPicker } from "./ModelVariantPicker"

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

const TASK_TABS = [
  { id: "text-generation" as ModelTask, label: "Texto & LLMs", icon: Brain02Icon, count: "14.2k" },
  {
    id: "text-to-image" as ModelTask,
    label: "Imágenes & Difusión",
    icon: Image01Icon,
    count: "3.8k",
  },
  { id: "embeddings" as ModelTask, label: "Embeddings & RAG", icon: DatabaseIcon, count: "1.9k" },
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
  const { toast } = useToast()
  const [expandedModelId, setExpandedModelId] = React.useState<string | null>(null)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast({
      title: "ID de Hugging Face copiado",
      description: id,
      variant: "success",
    })
  }

  const getModelBadge = (id: string, name: string) => {
    const lower = `${id} ${name}`.toLowerCase()
    if (lower.includes("deepseek")) {
      return {
        label: "DeepSeek",
        color: "bg-blue-500/10 text-blue-500 border-blue-500/25",
        dot: "bg-blue-500",
      }
    }
    if (lower.includes("qwen")) {
      return {
        label: "Qwen 2.5",
        color: "bg-purple-500/10 text-purple-500 border-purple-500/25",
        dot: "bg-purple-500",
      }
    }
    if (lower.includes("llama")) {
      return {
        label: "Llama 3.3",
        color: "bg-sky-500/10 text-sky-500 border-sky-500/25",
        dot: "bg-sky-500",
      }
    }
    if (lower.includes("mistral") || lower.includes("ministral")) {
      return {
        label: "Mistral",
        color: "bg-amber-500/10 text-amber-500 border-amber-500/25",
        dot: "bg-amber-500",
      }
    }
    if (lower.includes("flux") || lower.includes("sdxl")) {
      return {
        label: "Diffusion",
        color: "bg-pink-500/10 text-pink-500 border-pink-500/25",
        dot: "bg-pink-500",
      }
    }
    return {
      label: "LLM",
      color: "bg-primary/10 text-primary border-primary/25",
      dot: "bg-primary",
    }
  }

  return (
    <div className="space-y-4">
      {/* ─── Barra de Filtros de Categoría y Búsqueda ─── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card/60 p-2 rounded-3xl border border-border/70 backdrop-blur-md shadow-2xs">
        {/* Selector de Tarea con Tabs Redondeadas */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-2xl overflow-x-auto [scrollbar-width:none]">
          {TASK_TABS.map((t) => {
            const isActive = selectedTask === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTaskChange(t.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer",
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <HugeiconsIcon
                  icon={t.icon}
                  strokeWidth={1.75}
                  className={cn("size-3.5", isActive ? "text-primary" : "text-muted-foreground")}
                />
                <span>{t.label}</span>
                {t.count && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-md font-mono font-medium",
                      isActive
                        ? "bg-muted text-foreground"
                        : "bg-transparent text-muted-foreground/70"
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Input de Búsqueda Rápida */}
        <div className="relative w-full md:w-80">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={1.75}
            className="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, autor o arquitectura..."
            className="w-full rounded-2xl border border-border/80 bg-background/90 pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded-full cursor-pointer"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.75} className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Lista de Modelos con Diseño Moderno de Tarjetas Ricas ─── */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 glass-panel rounded-3xl border border-border/70">
            <div className="relative flex items-center justify-center">
              <span className="size-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
              <HugeiconsIcon
                icon={SparklesIcon}
                strokeWidth={1.75}
                className="size-4 text-primary absolute animate-pulse"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground font-sans">
                Consultando catálogo de Hugging Face
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Calculando compatibilidad en VRAM y cuantizaciones GGUF...
              </p>
            </div>
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 py-16 text-center glass-panel">
            <HugeiconsIcon
              icon={Brain02Icon}
              strokeWidth={1.5}
              className="size-10 text-muted-foreground/40 mb-3"
            />
            <p className="text-sm font-bold text-foreground font-sans">No se encontraron modelos</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Prueba buscando con otro término o seleccionando una categoría diferente.
            </p>
          </div>
        ) : (
          models.map((model) => {
            const isExpanded = expandedModelId === model.id
            const badge = getModelBadge(model.id, model.name)
            const isCopied = copiedId === model.id

            return (
              <div
                key={model.id}
                className={cn(
                  "overflow-hidden rounded-3xl border transition-all duration-200 glass-panel shadow-2xs group hover:shadow-md",
                  isExpanded
                    ? "border-primary/50 bg-card ring-1 ring-primary/20"
                    : "border-border/70 bg-card/80 hover:border-border hover:bg-card/95"
                )}
              >
                {/* Cuerpo Principal de la Tarjeta */}
                <div
                  onClick={() => setExpandedModelId(isExpanded ? null : model.id)}
                  className="p-4 sm:p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Info del Modelo */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <div className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted/80 text-foreground border border-border/80 shadow-2xs group-hover:scale-105 transition-transform">
                      {selectedTask === "text-to-image" ? (
                        <HugeiconsIcon
                          icon={Image01Icon}
                          strokeWidth={1.75}
                          className="size-5 text-pink-500"
                        />
                      ) : selectedTask === "embeddings" ? (
                        <HugeiconsIcon
                          icon={DatabaseIcon}
                          strokeWidth={1.75}
                          className="size-5 text-cyan-500"
                        />
                      ) : (
                        <HugeiconsIcon
                          icon={Brain02Icon}
                          strokeWidth={1.75}
                          className="size-5 text-primary"
                        />
                      )}
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-background",
                          badge.dot
                        )}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors font-sans truncate">
                          {model.name}
                        </span>

                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-bold font-mono",
                            badge.color
                          )}
                        >
                          {badge.label}
                        </span>

                        <span className="text-xs text-muted-foreground/80 font-mono">
                          @{model.author}
                        </span>
                      </div>

                      {/* Métricas y Badges de Rendimiento */}
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap font-medium">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <HugeiconsIcon
                            icon={Download01Icon}
                            strokeWidth={1.75}
                            className="size-3 text-muted-foreground/70"
                          />
                          {model.downloads.toLocaleString()}
                        </span>

                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <HugeiconsIcon
                            icon={FavouriteIcon}
                            strokeWidth={1.75}
                            className="size-3 text-rose-500 fill-rose-500/20"
                          />
                          {model.likes.toLocaleString()}
                        </span>

                        <span className="rounded-md bg-muted/60 border border-border/60 px-2 py-0.5 text-[10px] font-mono text-foreground font-semibold">
                          {model.variants.length} cuantizaciones GGUF
                        </span>

                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                          <HugeiconsIcon icon={ZapIcon} strokeWidth={1.75} className="size-3" />
                          Compatible GPU
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Acciones Rápidas */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleCopyId(e, model.id)}
                      className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Copiar ID de Hugging Face"
                    >
                      {isCopied ? (
                        <HugeiconsIcon
                          icon={Tick02Icon}
                          strokeWidth={2}
                          className="size-3.5 text-emerald-500"
                        />
                      ) : (
                        <HugeiconsIcon icon={Copy01Icon} strokeWidth={1.75} className="size-3.5" />
                      )}
                    </button>

                    <a
                      href={`https://huggingface.co/${model.id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Abrir en Hugging Face"
                    >
                      <HugeiconsIcon
                        icon={LinkSquare02Icon}
                        strokeWidth={1.75}
                        className="size-3.5"
                      />
                    </a>

                    <Button
                      size="sm"
                      variant={isExpanded ? "default" : "outline"}
                      className={cn(
                        "rounded-xl text-xs gap-1.5 h-8 font-medium transition-all cursor-pointer",
                        isExpanded
                          ? "bg-primary text-primary-foreground"
                          : "border-border/80 hover:bg-muted"
                      )}
                    >
                      <HugeiconsIcon
                        icon={Download01Icon}
                        strokeWidth={1.75}
                        className="size-3.5"
                      />
                      <span>{isExpanded ? "Ocultar" : "Ver Variantes"}</span>
                      <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        strokeWidth={1.75}
                        className={cn(
                          "size-3.5 transition-transform ml-0.5",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </Button>
                  </div>
                </div>

                {/* ─── Drawer de Variantes GGUF Expandible ─── */}
                {isExpanded && (
                  <div className="border-t border-border/60 bg-muted/20 p-4 sm:p-5 space-y-3 animate-in fade-in duration-200">
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
