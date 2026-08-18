import { CheckIcon, CpuIcon, DownloadIcon, HardDriveIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import type { ModelVariant } from "../types"

interface ModelVariantPickerProps {
  variants: ModelVariant[]
  selectedVariant?: ModelVariant
  onSelectVariant: (variant: ModelVariant) => void
  onDownload?: (variant: ModelVariant) => void
}

export function ModelVariantPicker({
  variants,
  selectedVariant,
  onSelectVariant,
  onDownload,
}: ModelVariantPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-foreground font-sans uppercase tracking-wider flex items-center gap-1.5">
          <SparklesIcon className="size-3.5 text-primary" />
          Cuantizaciones GGUF & Requisitos de VRAM
        </span>
        <span className="text-[11px] font-mono text-muted-foreground">
          {variants.length} variante(s) lista(s)
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {variants.map((v) => {
          const isSelected = selectedVariant?.filename === v.filename

          // Badge de ajuste VRAM
          let fitBadgeClass = "bg-muted text-muted-foreground border-border/80"
          let fitLabel = "CPU / RAM"

          if (v.fit_level === "full_vram") {
            fitBadgeClass =
              "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
            fitLabel = "100% GPU VRAM"
          } else if (v.fit_level === "partial_vram") {
            fitBadgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
            fitLabel = "GPU + CPU Offload"
          } else if (v.fit_level === "exceeds") {
            fitBadgeClass = "bg-destructive/10 text-destructive border-destructive/25"
            fitLabel = "Memoria Insuficiente"
          }

          return (
            <div
              key={v.filename}
              onClick={() => onSelectVariant(v)}
              className={cn(
                "group relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all duration-150 cursor-pointer glass-panel shadow-2xs",
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border/70 bg-card/90 hover:border-primary/40 hover:bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-foreground font-mono">{v.name}</span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[9px] font-bold font-mono",
                        fitBadgeClass
                      )}
                    >
                      {fitLabel}
                    </span>
                  </div>
                  {v.description && (
                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
                      {v.description}
                    </p>
                  )}
                </div>

                {isSelected && (
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="size-3 stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground font-mono">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <HardDriveIcon className="size-3 text-muted-foreground/70" />
                    <span className="text-foreground font-medium">{v.size_gb} GB</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CpuIcon className="size-3 text-muted-foreground/70" />
                    <span>~{v.required_vram_gb} GB VRAM</span>
                  </div>
                </div>

                {onDownload && (
                  <Button
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDownload(v)
                    }}
                    className="gap-1 rounded-xl text-xs h-7 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                  >
                    <DownloadIcon className="size-3" />
                    <span>Descargar</span>
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
