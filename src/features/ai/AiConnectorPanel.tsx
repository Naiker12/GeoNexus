import {
  CheckCircle2Icon,
  KeyRoundIcon,
  PlugZapIcon,
  WifiOffIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import type { AiConnector } from "@/features/workspace/workspace-data"

type AiConnectorPanelProps = {
  connectors: AiConnector[]
}

const statusMeta = {
  online: {
    label: "Online",
    icon: CheckCircle2Icon,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 [.geo-dark_&]:border-emerald-400/20 [.geo-dark_&]:bg-emerald-500/10 [.geo-dark_&]:text-emerald-300 [.graphite_&]:border-emerald-400/20 [.graphite_&]:bg-emerald-500/10 [.graphite_&]:text-emerald-300 [.midnight_&]:border-emerald-400/20 [.midnight_&]:bg-emerald-500/10 [.midnight_&]:text-emerald-300",
  },
  offline: {
    label: "Offline",
    icon: WifiOffIcon,
    className:
      "border-slate-200 bg-slate-50 text-slate-600 [.geo-dark_&]:border-border [.geo-dark_&]:bg-muted [.geo-dark_&]:text-muted-foreground [.graphite_&]:border-border [.graphite_&]:bg-muted [.graphite_&]:text-muted-foreground [.midnight_&]:border-border [.midnight_&]:bg-muted [.midnight_&]:text-muted-foreground",
  },
  "needs-key": {
    label: "API key",
    icon: KeyRoundIcon,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 [.geo-dark_&]:border-amber-400/20 [.geo-dark_&]:bg-amber-500/10 [.geo-dark_&]:text-amber-300 [.graphite_&]:border-amber-400/20 [.graphite_&]:bg-amber-500/10 [.graphite_&]:text-amber-300 [.midnight_&]:border-amber-400/20 [.midnight_&]:bg-amber-500/10 [.midnight_&]:text-amber-300",
  },
}

export function AiConnectorPanel({ connectors }: AiConnectorPanelProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Conectores IA</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Local primero: Ollama y LM Studio. Cloud solo con API key segura.
            </p>
          </div>
          <Button variant="outline" size="sm">
            <PlugZapIcon className="size-4" />
            Probar
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {connectors.map((connector) => {
          const meta = statusMeta[connector.status]
          const StatusIcon = meta.icon

          return (
            <article
              key={connector.id}
              className="rounded-lg border border-border bg-background p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium">{connector.name}</h3>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {connector.provider}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {connector.model}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium",
                    meta.className
                  )}
                >
                  <StatusIcon className="size-3" />
                  {meta.label}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">{connector.endpoint}</span>
                <span>{connector.supportsTools ? "tools" : "context"}</span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
