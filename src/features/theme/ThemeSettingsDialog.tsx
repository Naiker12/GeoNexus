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
          className="w-full justify-start gap-2 overflow-hidden px-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2"
        >
          <PaletteIcon className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">
            Temas
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-lg p-0 sm:max-w-[46rem]">
        <DialogHeader className="mb-0 border-b border-border px-5 pb-4 pt-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PaletteIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Apariencia</DialogTitle>
              <DialogDescription className="mt-1">
                Ajusta el tema visual de GeoNexus sin cambiar tus datos ni el
                contexto de trabajo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid max-h-[min(34rem,calc(100svh-9rem))] gap-2 overflow-auto p-5 sm:grid-cols-2">
          {themePresets.map((theme) => {
            const active = activeTheme === theme.id

            return (
              <button
                key={theme.id}
                type="button"
                aria-pressed={active}
                className={cn(
                  "group flex min-h-28 items-stretch gap-3 rounded-lg border bg-background p-2 text-left transition-colors hover:bg-muted",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground"
                )}
                onClick={() => onThemeChange(theme.id)}
              >
                <ThemePreview theme={theme} />
                <span className="min-w-0 flex-1 py-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {theme.name}
                    </span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground group-aria-pressed:bg-primary/10 group-aria-pressed:text-primary">
                      {theme.tone}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {theme.description}
                  </span>
                </span>
                <span
                  className={cn(
                    "mt-1 flex size-6 shrink-0 items-center justify-center rounded-md border",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-transparent"
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

function ThemePreview({ theme }: { theme: ThemePreset }) {
  const isBright = ["geo-light", "emerald", "cobalt", "lagoon", "terra"].includes(
    theme.id
  )
  const accentClass = getPreviewAccent(theme.id)

  return (
    <span
      className={cn(
        "flex h-20 w-24 shrink-0 overflow-hidden rounded-md border border-border p-2",
        theme.swatch,
        isBright && "border-slate-200"
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "flex w-7 flex-col gap-1 border-r pr-1",
          isBright ? "border-black/10" : "border-white/20"
        )}
      >
        <span
          className={cn(
            "h-2 rounded-sm",
            isBright ? "bg-black/45" : "bg-white/70"
          )}
        />
        <span
          className={cn(
            "h-2 rounded-sm",
            isBright ? "bg-black/25" : "bg-white/35"
          )}
        />
        <span
          className={cn(
            "h-2 rounded-sm",
            isBright ? "bg-black/25" : "bg-white/35"
          )}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 pl-2">
        <span className="flex items-center gap-1">
          <SparklesIcon
            className={cn("size-3", isBright ? "text-black/55" : "text-white/80")}
          />
          <span
            className={cn(
              "h-2 flex-1 rounded-sm",
              isBright ? "bg-black/40" : "bg-white/70"
            )}
          />
        </span>
        <span
          className={cn(
            "mt-auto h-5 rounded-md shadow-sm",
            isBright ? "bg-white" : "bg-white/85"
          )}
        >
          <span className={cn("block h-full w-1/2 rounded-md", accentClass)} />
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
