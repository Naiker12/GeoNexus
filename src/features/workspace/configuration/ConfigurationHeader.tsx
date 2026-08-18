import { Settings2Icon } from "lucide-react"

export function ConfigurationHeader() {
  return (
    <header className="flex shrink-0 items-center gap-3.5 border-b border-border/70 bg-muted/10 px-6 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground border border-border/60">
        <Settings2Icon className="size-4.5" />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Configuración General</h2>
        <p className="truncate text-xs text-muted-foreground">Parámetros del sistema, motores geoespaciales, modelos y agentes</p>
      </div>
    </header>
  )
}
