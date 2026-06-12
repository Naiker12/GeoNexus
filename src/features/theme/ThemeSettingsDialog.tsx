import { CheckIcon, PaletteIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { themePresets, type ThemePreset } from "@/features/workspace/workspace-data"
import { cn } from "@/lib/utils"

type ThemeSettingsDialogProps = {
  activeTheme: ThemePreset["id"]
  onThemeChange: (theme: ThemePreset["id"]) => void
}

export function ThemeSettingsDialog({
  activeTheme,
  onThemeChange,
}: ThemeSettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 overflow-hidden px-2 hover:bg-transparent hover:text-sidebar-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2"
        >
          <PaletteIcon className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">
            Temas
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-xl p-0 sm:max-w-[46rem] border border-border shadow-2xl">
        <DialogHeader className="mb-0 border-b border-border px-5 pb-4 pt-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PaletteIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold">Apariencia</DialogTitle>
              <DialogDescription className="mt-1 max-w-lg text-sm leading-5">
                Ajusta el tema visual de Geo Agents sin cambiar tus datos ni el
                contexto de trabajo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid max-h-[min(32rem,calc(100svh-8rem))] gap-4 overflow-auto p-4 [scrollbar-width:thin] grid-cols-1 sm:grid-cols-2 sm:p-6">
          {themePresets.map((theme) => {
            const active = activeTheme === theme.id

            return (
              <button
                key={theme.id}
                type="button"
                aria-pressed={active}
                className={cn(
                  "group relative flex flex-col rounded-xl border bg-background p-4 text-left transition-all hover:bg-muted/70 hover:shadow-sm",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground"
                )}
                onClick={() => onThemeChange(theme.id)}
              >
                <span className="flex items-center gap-3.5 pr-7">
                  <ThemePreview theme={theme} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-5 text-foreground">
                      {theme.name}
                    </span>
                    <span className="mt-1 inline-flex rounded-md bg-muted px-2 py-0.5 text-[0.7rem] font-medium leading-4 text-muted-foreground group-aria-pressed:bg-primary/10 group-aria-pressed:text-primary">
                      {theme.tone}
                    </span>
                  </span>
                </span>
                <span className="mt-3 block text-xs leading-5 text-muted-foreground/90">
                  {theme.description}
                </span>
                <span
                  className={cn(
                    "absolute right-3 top-3 flex size-5 items-center justify-center rounded-md border transition-all",
                    active
                      ? "border-primary bg-primary text-primary-foreground scale-100"
                      : "border-border bg-background text-transparent hover:border-primary/50"
                  )}
                >
                  <CheckIcon className="size-3.5" />
                </span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Tarjeta de previsualización de tema individual
function ThemePreview({ theme }: { theme: ThemePreset }) {
  const isBright = ["geo-light", "emerald", "cobalt", "lagoon", "terra"].includes(
    theme.id
  )
  const accentClass = getPreviewAccent(theme.id)

  return (
    <span
      className={cn(
        "flex h-10 w-16 shrink-0 overflow-hidden rounded-md border border-border p-1.5",
        theme.swatch,
        isBright && "border-slate-200"
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "flex w-4 flex-col gap-[3px] border-r pr-[2px]",
          isBright ? "border-black/10" : "border-white/20"
        )}
      >
        <span className={cn("h-[4px] rounded-sm", isBright ? "bg-black/45" : "bg-white/70")} />
        <span className={cn("h-[3px] rounded-sm", isBright ? "bg-black/25" : "bg-white/35")} />
        <span className={cn("h-[3px] rounded-sm", isBright ? "bg-black/25" : "bg-white/35")} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px] pl-1.5">
        <span className="flex items-center gap-[2px]">
          <SparklesIcon className={cn("size-[10px]", isBright ? "text-black/55" : "text-white/80")} />
          <span className={cn("h-[3px] flex-1 rounded-sm", isBright ? "bg-black/40" : "bg-white/70")} />
        </span>
        <span className={cn("mt-auto h-[12px] rounded-sm shadow-sm", isBright ? "bg-white" : "bg-white/85")}>
          <span className={cn("block h-full w-1/2 rounded-sm", accentClass)} />
        </span>
      </span>
    </span>
  )
}

function getPreviewAccent(theme: ThemePreset["id"]) {
  const accents: Record<ThemePreset["id"], string> = {
    "geo-dark": "bg-emerald-500",
    "geo-light": "bg-slate-700",
    emerald: "bg-emerald-500",
    cobalt: "bg-sky-500",
    midnight: "bg-cyan-400",
    lagoon: "bg-teal-600",
    graphite: "bg-zinc-700",
    terra: "bg-amber-700",
  }

  return accents[theme]
}
