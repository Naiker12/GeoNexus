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
      <DialogContent className="rounded-lg p-0 sm:max-w-[44rem]">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PaletteIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">Apariencia</DialogTitle>
              <DialogDescription className="mt-1 max-w-md text-sm leading-5">
                Ajusta el tema visual de GeoNexus sin cambiar tus datos ni el
                contexto de trabajo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid max-h-[min(30rem,calc(100svh-8rem))] gap-2 overflow-auto p-3 [scrollbar-width:thin] grid-cols-1 sm:grid-cols-3 sm:p-4">
          {themePresets.map((theme) => {
            const active = activeTheme === theme.id

            return (
              <button
                key={theme.id}
                type="button"
                aria-pressed={active}
                className={cn(
                  "group relative flex flex-col rounded-lg border bg-background p-2.5 text-left transition-colors hover:bg-muted",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground"
                )}
                onClick={() => onThemeChange(theme.id)}
              >
                <span className="flex items-start gap-2 pr-7">
                  <ThemePreview theme={theme} />
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="block text-sm font-semibold leading-5 text-foreground">
                      {theme.name}
                    </span>
                    <span className="mt-1 inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[0.68rem] leading-4 text-muted-foreground group-aria-pressed:bg-primary/10 group-aria-pressed:text-primary">
                      {theme.tone}
                    </span>
                  </span>
                </span>
                <span className="mt-1.5 block text-xs leading-4 text-muted-foreground">
                  {theme.description}
                </span>
                <span
                  className={cn(
                    "absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-sm border",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-transparent"
                  )}
                >
                  <CheckIcon className="size-3" />
                </span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ThemePreview({ theme }: { theme: ThemePreset }) {
  const isBright = ["geo-light", "emerald", "cobalt", "lagoon", "terra"].includes(
    theme.id
  )
  const accentClass = getPreviewAccent(theme.id)

  return (
    <span
      className={cn(
        "flex h-9 w-14 shrink-0 overflow-hidden rounded-md border border-border p-1",
        theme.swatch,
        isBright && "border-slate-200"
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "flex w-3.5 flex-col gap-[2px] border-r pr-[2px]",
          isBright ? "border-black/10" : "border-white/20"
        )}
      >
        <span className={cn("h-[3px] rounded-sm", isBright ? "bg-black/45" : "bg-white/70")} />
        <span className={cn("h-[3px] rounded-sm", isBright ? "bg-black/25" : "bg-white/35")} />
        <span className={cn("h-[3px] rounded-sm", isBright ? "bg-black/25" : "bg-white/35")} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[2px] pl-1">
        <span className="flex items-center gap-[2px]">
          <SparklesIcon className={cn("size-[9px]", isBright ? "text-black/55" : "text-white/80")} />
          <span className={cn("h-[3px] flex-1 rounded-sm", isBright ? "bg-black/40" : "bg-white/70")} />
        </span>
        <span className={cn("mt-auto h-[10px] rounded-sm shadow-sm", isBright ? "bg-white" : "bg-white/85")}>
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
