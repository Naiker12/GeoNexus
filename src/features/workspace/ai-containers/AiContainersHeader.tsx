import { KeyRoundIcon } from "lucide-react"

import { GeoAgentsIcon } from "@/components/brand/GeoAgentsIcon"
import { Button } from "@/components/ui/Button"
import type { AiConnector } from "@/features/workspace/workspace-data"

type AiContainersHeaderProps = {
  connectors: AiConnector[]
  onAddProvider: () => void
  onConnectApi: () => void
}

const summaries = [
  {
    label: "ONLINE",
    getValue: (connectors: AiConnector[]) =>
      connectors.filter((c) => c.status === "online").length,
  },
  {
    label: "LOCAL",
    getValue: (connectors: AiConnector[]) =>
      connectors.filter((c) => c.provider === "local").length,
  },
  {
    label: "CLOUD",
    getValue: (connectors: AiConnector[]) =>
      connectors.filter((c) => c.provider === "cloud").length,
  },
  {
    label: "MCP",
    getValue: (connectors: AiConnector[]) =>
      connectors.filter((c) => c.provider === "mcp").length,
  },
]

export function AiContainersHeader({
  connectors,
  onAddProvider,
  onConnectApi,
}: AiContainersHeaderProps) {
  return (
    <header className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
      <div className="p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GeoAgentsIcon className="size-4" variant="agent" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                Conecta modelos, APIs y herramientas IA
              </h1>
              <p className="mt-1 max-w-3xl truncate text-xs text-muted-foreground sm:text-sm">
                Multi-LLM, offline-first, proveedores locales, cloud y MCP
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onConnectApi}>
              <KeyRoundIcon className="size-4" />
              Conectar por API
            </Button>
            <Button size="sm" onClick={onAddProvider}>
              <GeoAgentsIcon className="size-4" variant="agent" />
              Agregar modelo
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-4">
          {summaries.map((item) => (
            <div key={item.label}>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-0.5 text-lg font-bold leading-5">
                {item.getValue(connectors)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </header>
  )
}
