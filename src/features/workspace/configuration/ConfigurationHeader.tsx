import { Settings2Icon } from "lucide-react"

export function ConfigurationHeader() {
  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-border px-5 py-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Settings2Icon className="size-4.5" />
      </div>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">
          Configuración
        </h2>
        <p className="truncate text-xs text-muted-foreground">
          Workspace sin proyecto activo
        </p>
      </div>
    </header>
  )
}
