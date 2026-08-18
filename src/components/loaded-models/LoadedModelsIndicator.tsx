import * as React from "react"
import {
  ActivityIcon,
  BotIcon,
  CpuIcon,
  ImageIcon,
  LogOutIcon,
  SparklesIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ejectModel, getLoadedModels } from "@/features/hub/api"
import type { LoadedModelEntry } from "@/features/hub/types"
import { cn } from "@/lib/utils"

export function LoadedModelsIndicator() {
  const [data, setData] = React.useState<{
    count: number
    total_vram_gb: number
    total_ram_gb: number
    models: LoadedModelEntry[]
  }>({
    count: 0,
    total_vram_gb: 0,
    total_ram_gb: 0,
    models: [],
  })
  const [open, setOpen] = React.useState(false)

  const refresh = React.useCallback(() => {
    getLoadedModels().then(setData).catch(console.error)
  }, [])

  React.useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 5000)
    return () => clearInterval(timer)
  }, [refresh])

  const handleEject = async (modelId?: string) => {
    try {
      await ejectModel(modelId)
      refresh()
    } catch (e) {
      console.error(e)
    }
  }

  const hasModels = data.count > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
            hasModels
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15"
              : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
          title="Modelos cargados en VRAM / RAM"
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              hasModels ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
            )}
          />
          <CpuIcon className="size-3" />
          <span>
            {hasModels ? `${data.count} activo (${data.total_vram_gb} GB VRAM)` : "0 en VRAM"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={8} className="w-80 rounded-3xl p-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <CpuIcon className="size-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Modelos en Memoria</span>
          </div>
          {hasModels && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleEject()}
              className="text-[10px] text-destructive hover:bg-destructive/10 h-6 px-2 rounded-lg"
            >
              Liberar Todo
            </Button>
          )}
        </div>

        <div className="py-2.5 space-y-2 max-h-60 overflow-y-auto [scrollbar-width:thin]">
          {!hasModels ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              <ActivityIcon className="size-5 mx-auto mb-1.5 opacity-40" />
              <span>No hay modelos cargados actualmente en VRAM.</span>
            </div>
          ) : (
            data.models.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-2.5 text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {m.kind === "image" ? <ImageIcon className="size-3.5" /> : <BotIcon className="size-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-foreground truncate block">{m.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {m.vram_gb} GB VRAM • {m.device}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleEject(m.id)}
                  className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                  title="Eyectar y liberar VRAM"
                >
                  <LogOutIcon className="size-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
