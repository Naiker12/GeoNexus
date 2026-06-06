import { CheckIcon, PaletteIcon } from "lucide-react"

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
        <Button variant="ghost" className="w-full justify-start gap-2 px-2">
          <PaletteIcon className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">
            Temas
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-lg p-5 sm:max-w-[30rem]">
        <DialogHeader>
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PaletteIcon className="size-4" />
          </div>
          <DialogTitle>Apariencia</DialogTitle>
          <DialogDescription>
            Selecciona el tema visual de GeoNexus. Esto solo cambia la interfaz.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {themePresets.map((theme) => {
            const active = activeTheme === theme.id

            return (
              <button
                key={theme.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted",
                  active && "border-primary bg-primary/10"
                )}
                onClick={() => onThemeChange(theme.id)}
              >
                <span
                  className={cn(
                    "size-9 shrink-0 rounded-md border border-border",
                    theme.swatch
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{theme.name}</span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {theme.tone}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {theme.description}
                  </span>
                </span>
                {active && <CheckIcon className="size-4 text-primary" />}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
