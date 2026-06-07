import { BarChart3Icon, DatabaseIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"

export function AnalysisHeader() {
  return (
    <header className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">Analisis</h1>
            <p className="mt-0.5 max-w-4xl text-sm leading-5 text-muted-foreground">
              Consumo de tokens, llamadas IA, tools MCP y trazabilidad del proyecto.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button variant="outline" size="sm">
            <DatabaseIcon className="size-4" />
            Exportar trazas
          </Button>
          <Button size="sm">
            <SparklesIcon className="size-4" />
            Optimizar prompts
          </Button>
        </div>
      </div>
    </header>
  )
}
