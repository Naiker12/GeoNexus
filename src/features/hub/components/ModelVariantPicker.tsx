import * as React from "react"
import { CheckIcon, CpuIcon, DownloadIcon, HardDriveIcon, ZapIcon } from "lucide-react"
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
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Variantes y Cuantizaciones Disponibles
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {variants.map((v) => {
          const isSelected = selectedVariant?.filename === v.filename

          // Badge de ajuste VRAM
          let fitBadgeClass = "bg-muted text-muted-foreground border-border"
          let fitLabel = "CPU / RAM"

          if (v.fit_level === "full_vram") {
            fitBadgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
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
                "group relative flex flex-col justify-between rounded-2xl border p-3 transition-all cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border/70 bg-card hover:border-border hover:bg-muted/30"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-foreground font-mono">{v.name}</span>
                    <span className={cn("rounded-full border px-2 py-0.2 text-[9px] font-medium", fitBadgeClass)}>
                      {fitLabel}
                    </span>
                  </div>
                  {v.description && (
                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">{v.description}</p>
                  )}
                </div>

                {isSelected && (
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="size-3 stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <HardDriveIcon className="size-3 text-muted-foreground/70" />
                  <span>{v.size_gb} GB</span>
                </div>
                <div className="flex items-center gap-1">
                  <CpuIcon className="size-3 text-muted-foreground/70" />
                  <span>~{v.required_vram_gb} GB VRAM</span>
                </div>

                {onDownload && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDownload(v)
                    }}
                    className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                    title="Descargar esta variante"
                  >
                    <DownloadIcon className="size-3" />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
