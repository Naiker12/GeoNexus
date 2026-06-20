import * as React from "react"
import { PlusIcon, SearchIcon, WrenchIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"
import { ConnectorLogo } from "@/features/workspace/connectors/ConnectorLogo"
import type { ConnectorProvider } from "@/features/workspace/connectors/connector-types"
import { cn } from "@/lib/utils"

type AddConnectorDialogProps = {
  open: boolean
  providers: ConnectorProvider[]
  onOpenChange: (open: boolean) => void
  onSelectProvider: (provider: ConnectorProvider) => void
}

export function AddConnectorDialog({
  open,
  providers,
  onOpenChange,
  onSelectProvider,
}: AddConnectorDialogProps) {
  const [query, setQuery] = React.useState("")

  React.useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredProviders = normalizedQuery
    ? providers.filter((provider) =>
        [
          provider.name,
          provider.kind,
          provider.description,
          provider.formats.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : providers

  const selectProvider = (provider: ConnectorProvider) => {
    onSelectProvider(provider)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[calc(50%+1rem)] flex max-h-[calc(100svh-6rem)] w-[min(94vw,54rem)] flex-col overflow-hidden rounded-lg p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PlusIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">Agregar conector</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5">
                Selecciona una fuente disponible o crea una conexion manual para
                simular el flujo en Geo Agents.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 gap-3 overflow-auto p-4 [scrollbar-width:thin]">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <label className="relative block">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-8"
                placeholder="Buscar OneDrive, QGIS, carpeta local..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {providers.length > 0 && (
              <Button
                variant="outline"
                className="h-9 justify-start"
                type="button"
                onClick={() => selectProvider(providers[0])}
              >
                <WrenchIcon className="size-4" />
                Agregar por mi cuenta
              </Button>
            )}
          </div>

          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProviders.map((provider) => (
              <ConnectorChoiceCard
                key={provider.id}
                provider={provider}
                onSelect={() => selectProvider(provider)}
              />
            ))}
          </section>

          {filteredProviders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/35 p-4 text-sm text-muted-foreground">
              No hay conectores con ese filtro. Usa Agregar por mi cuenta para
              preparar una conexion manual.
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ConnectorChoiceCard({
  provider,
  onSelect,
}: {
  provider: ConnectorProvider
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className="group rounded-lg border border-border bg-background/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
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
            <h3 className="truncate text-sm font-semibold">{provider.name}</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {provider.status === "connected" ? "Conectado" : "Desconectado"}
            </p>
          </div>
        </div>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-primary transition group-hover:border-primary/40">
          <PlusIcon className="size-4" />
        </span>
      </div>

      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
        {provider.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {provider.formats.slice(0, 3).map((format) => (
          <span
            key={format}
            className="rounded-md border border-border bg-muted/45 px-1.5 py-0.5 text-[0.68rem] text-muted-foreground"
          >
            {format}
          </span>
        ))}
      </div>
    </button>
  )
}
