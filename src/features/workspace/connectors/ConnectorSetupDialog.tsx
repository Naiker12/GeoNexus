import * as React from "react"
import {
  CheckCircle2Icon,
  DatabaseIcon,
  RouteIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ConnectorInfoPanel } from "@/features/workspace/connectors/ConnectorInfoPanel"
import { ConnectorLogo } from "@/features/workspace/connectors/ConnectorLogo"
import { InfoRow } from "@/features/workspace/connectors/InfoRow"
import type { ConnectorProvider } from "@/features/workspace/connectors/connector-types"
import { cn } from "@/lib/utils"

type ConnectorSetupDialogProps = {
  open: boolean
  provider: ConnectorProvider
  onOpenChange: (open: boolean) => void
}

export function ConnectorSetupDialog({
  open,
  provider,
  onOpenChange,
}: ConnectorSetupDialogProps) {
  const [simulated, setSimulated] = React.useState(false)

  React.useEffect(() => {
    setSimulated(false)
  }, [provider.id, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[calc(50%+1rem)] flex max-h-[calc(100svh-6rem)] w-[min(94vw,48rem)] flex-col overflow-hidden rounded-lg p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                provider.accent
              )}
            >
              <ConnectorLogo provider={provider} className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">{provider.name}</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5">
                Vista simulada del flujo: permisos, herramientas, indexacion y
                memoria. No se abre ningun proveedor real.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 gap-4 overflow-auto p-4 [scrollbar-width:thin]">
          <section className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
            <ConnectorSummary provider={provider} />
            <ConnectorCapabilityPanels provider={provider} />
          </section>

          <ConnectorFormats formats={provider.formats} />

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-between">
            <Button variant="outline" size="sm" type="button">
              <CheckCircle2Icon className="size-4" />
              {simulated ? "Flujo simulado" : "Sin conexion real"}
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={() => setSimulated(true)}
              >
                <RouteIcon className="size-4" />
                {simulated ? "Simulacion lista" : provider.actionLabel}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ConnectorSummary({ provider }: { provider: ConnectorProvider }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-3">
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-lg border",
          provider.accent
        )}
      >
        <ConnectorLogo provider={provider} className="size-7" />
      </div>
      <h3 className="mt-3 text-sm font-semibold">Que conecta</h3>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">
        {provider.description}
      </p>
      <div className="mt-3 grid gap-2 text-xs">
        <InfoRow label="Autenticacion" value={provider.auth} />
        <InfoRow label="Scope base" value={provider.scope} />
        <InfoRow label="Endpoint" value={provider.endpoint} />
        <InfoRow label="Roadmap" value={provider.phase} />
      </div>
    </div>
  )
}

function ConnectorCapabilityPanels({
  provider,
}: {
  provider: ConnectorProvider
}) {
  return (
    <div className="grid gap-3">
      <ConnectorInfoPanel
        icon={ShieldCheckIcon}
        title="Permisos solicitados"
        items={provider.permissions}
      />
      <ConnectorInfoPanel
        icon={WrenchIcon}
        title="Herramientas MCP"
        items={provider.tools}
      />
      <ConnectorInfoPanel
        icon={DatabaseIcon}
        title="Indexa en GeoNexus"
        items={provider.indexTargets}
      />
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <RouteIcon className="size-4 text-primary" />
          Flujo simulado
        </div>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          Connector Manager recibe la solicitud, valida permisos, crea el
          conector, envia archivos al indexador, genera embeddings en ChromaDB y
          actualiza el Knowledge Graph para GeoNexus IA.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          MCP: {provider.mcpServer}
        </p>
      </div>
    </div>
  )
}

function ConnectorFormats({ formats }: { formats: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Formatos compatibles
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {formats.map((format) => (
          <span
            key={format}
            className="rounded-md border border-border bg-muted/45 px-2 py-1 text-xs text-muted-foreground"
          >
            {format}
          </span>
        ))}
      </div>
    </div>
  )
}
