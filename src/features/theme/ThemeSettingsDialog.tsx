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
      <DialogContent className="rounded-lg p-0 sm:max-w-[34rem]">
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

        <div className="grid gap-2 p-5">
          {themePresets.map((theme) => {
            const active = activeTheme === theme.id

            return (
              <button
                key={theme.id}
                type="button"
                aria-pressed={active}
                className={cn(
                  "group flex items-stretch gap-3 rounded-lg border bg-background p-2 text-left transition-colors hover:bg-muted",
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
  const isLight = theme.id === "geo-light"

  return (
    <span
      className={cn(
        "flex h-20 w-28 shrink-0 overflow-hidden rounded-md border border-border p-2",
        theme.swatch,
        isLight && "border-slate-200"
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          "flex w-7 flex-col gap-1 border-r pr-1",
          isLight ? "border-slate-200" : "border-white/20"
        )}
      >
        <span
          className={cn(
            "h-2 rounded-sm",
            isLight ? "bg-slate-500/70" : "bg-white/70"
          )}
        />
        <span
          className={cn(
            "h-2 rounded-sm",
            isLight ? "bg-slate-400/45" : "bg-white/35"
          )}
        />
        <span
          className={cn(
            "h-2 rounded-sm",
            isLight ? "bg-slate-400/45" : "bg-white/35"
          )}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 pl-2">
        <span className="flex items-center gap-1">
          <SparklesIcon
            className={cn("size-3", isLight ? "text-slate-500" : "text-white/80")}
          />
          <span
            className={cn(
              "h-2 flex-1 rounded-sm",
              isLight ? "bg-slate-500/70" : "bg-white/70"
            )}
          />
        </span>
        <span
          className={cn(
            "mt-auto h-5 rounded-md",
            isLight ? "bg-white shadow-sm" : "bg-white/85"
          )}
        />
      </span>
    </span>
  )
}
