import { RefreshCwIcon, SaveIcon, Settings2Icon } from "lucide-react"

import { Button } from "@/components/ui/Button"

export function ConfigurationHeader() {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Settings2Icon className="size-4.5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">
            Configuración
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            geoclaude · workspace activo: POT Barranquilla 2024
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm">
          <RefreshCwIcon className="size-3.5" />
          Recargar
        </Button>
        <Button size="sm">
          <SaveIcon className="size-3.5" />
          Guardar cambios
        </Button>
      </div>
    </header>
  )
}
