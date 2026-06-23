import { ExternalLinkIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { ConnectorLogo } from "@/features/workspace/connectors/ConnectorLogo"
import type { ConnectorProviderInfo } from "@/features/workspace/connectors/connector-types"
import { cn } from "@/lib/utils"

type ConnectorCardProps = {
  provider: ConnectorProviderInfo
  onSelect: (provider: ConnectorProviderInfo) => void
}

export function ConnectorCard({ provider, onSelect }: ConnectorCardProps) {
  return (
    <article className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg border",
              provider.accent
            )}
          >
            <ConnectorLogo provider={provider} className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{provider.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{provider.kind}</p>
          </div>
        </div>
        <StatusBadge status={provider.status} />
      </div>

      <p className="mt-3 min-h-10 text-sm leading-5 text-muted-foreground">
        {provider.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {provider.formats.slice(0, 4).map((format) => (
          <span
            key={format}
            className="rounded-md border border-border bg-background/70 px-1.5 py-0.5 text-[0.68rem] text-muted-foreground"
          >
            {format}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="truncate text-xs text-muted-foreground">
          {provider.auth}
        </span>
        <Button variant="outline" size="sm" onClick={() => onSelect(provider)}>
          <ExternalLinkIcon className="size-4" />
          Ver flujo
        </Button>
      </div>
    </article>
  )
}

function StatusBadge({ status }: { status: ConnectorProviderInfo["status"] }) {
  if (status === "connected") {
    return (
      <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.68rem] font-medium text-emerald-600 dark:text-emerald-400">
        Conectado
      </span>
    )
  }
  return null
}
