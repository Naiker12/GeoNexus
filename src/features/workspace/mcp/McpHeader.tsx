import { FileUpIcon, PlugZapIcon, RefreshCwIcon, ServerIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { mcpServers, mcpTools } from "@/features/workspace/mcp/mcp-data"

type McpHeaderProps = {
  onRegister: () => void
}

export function McpHeader({ onRegister }: McpHeaderProps) {
  const activeCount = mcpServers.filter((s) => s.status === "online").length

  return (
    <header className="flex flex-col rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
      
      <div className="flex flex-col gap-3 border-b border-border px-4 py-2.5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ServerIcon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight">Servidores MCP</h1>
            <p className="truncate font-mono text-[0.65rem] text-muted-foreground">
              mcp-router · rust core · proyecto: POT-Barranquilla-2024
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
            <RefreshCwIcon className="mr-1.5 size-3.5" />
            Probar todos
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={onRegister}>
            <FileUpIcon className="mr-1.5 size-3.5" />
            Cargar config
          </Button>
          <Button size="sm" className="h-7 text-xs px-2.5" onClick={onRegister}>
            <PlugZapIcon className="mr-1.5 size-3.5" />
            Registrar servidor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-border border-b-0 sm:grid-cols-4 sm:divide-y-0">
        <div className="px-4 py-2">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Servidores
          </p>
          <p className="mt-0.5 flex items-baseline gap-1.5 text-lg font-bold">
            {mcpServers.length}
            <span className="text-[0.65rem] font-normal text-muted-foreground">
              registrados
            </span>
          </p>
        </div>
        <div className="px-4 py-2">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Online
          </p>
          <p className="mt-0.5 flex items-baseline gap-1.5 text-lg font-bold text-emerald-500">
            {activeCount}
            <span className="text-[0.65rem] font-normal text-muted-foreground">
              de {mcpServers.length} activos
            </span>
          </p>
        </div>
        <div className="px-4 py-2">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Tools
          </p>
          <p className="mt-0.5 flex items-baseline gap-1.5 text-lg font-bold">
            {mcpTools.length}
            <span className="text-[0.65rem] font-normal text-muted-foreground">
              expuestas al chat
            </span>
          </p>
        </div>
        <div className="px-4 py-2">
          <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
            Rate limit
          </p>
          <p className="mt-0.5 flex items-baseline gap-1.5 text-lg font-bold">
            60
            <span className="text-[0.65rem] font-normal text-muted-foreground">
              req/min global
            </span>
          </p>
        </div>
      </div>
    </header>
  )
}
