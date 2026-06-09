import * as React from "react"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ProviderBrandIcon } from "@/features/workspace/ai-containers/ProviderBrandIcon"
import { useConnectors } from "@/contexts/ConnectorsContext"
import { cn } from "@/lib/utils"

export function ModelSelector({
  children,
}: {
  children?: React.ReactNode
}) {
  const {
    connectors,
    activeConnectorId,
    setActiveConnectorId,
    setConnectors,
  } = useConnectors()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const activeConnector = activeConnectorId
    ? connectors.find((c) => c.id === activeConnectorId)
    : null

  const allEntries = React.useMemo(() => {
    const entries: {
      modelId: string
      connectorId: string
      connectorName: string
    }[] = []
    for (const c of connectors) {
      for (const m of c.models) {
        entries.push({
          modelId: m,
          connectorId: c.id,
          connectorName: c.name,
        })
      }
    }
    return entries
  }, [connectors])

  const filtered = React.useMemo(
    () =>
      query
        ? allEntries.filter(
            (e) =>
              e.modelId.toLowerCase().includes(query.toLowerCase()) ||
              e.connectorName.toLowerCase().includes(query.toLowerCase())
          )
        : allEntries,
    [allEntries, query]
  )

  const isActive =
    activeConnector &&
    activeConnector.model !== "Sin modelo" &&
    activeConnector.models.length > 0

  const triggerLabel = isActive
    ? activeConnector.model
    : "Sin modelo"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs font-normal"
            aria-label="Modelos y conexiones"
          >
            <span className="max-w-36 truncate">{triggerLabel}</span>
            <ChevronDownIcon className="size-3 shrink-0 opacity-60" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-72 overflow-hidden rounded-lg p-0"
        align="end"
        side="bottom"
        sideOffset={4}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar modelos..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-1">
          {isActive && !query && (
            <div className="border-b border-border px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Modelo activo
              </p>
              <div className="mt-1 flex items-center gap-2 rounded-md bg-accent/50 px-2 py-1.5 text-sm">
                <CheckIcon className="size-4 shrink-0 text-primary" />
                <div className="flex size-5 items-center justify-center rounded bg-muted text-muted-foreground">
                  <ProviderBrandIcon
                    providerId={activeConnector.id}
                    className="size-3"
                  />
                </div>
                <span className="truncate font-medium">
                  {activeConnector.model}
                </span>
                <span className="ml-auto shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {activeConnector.name}
                </span>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-8 text-center text-sm text-muted-foreground">
              <SearchIcon className="size-5 opacity-30" />
              <span>
                {allEntries.length === 0
                  ? "No hay modelos disponibles"
                  : "No se encontraron modelos"}
              </span>
            </div>
          ) : (
            <div>
              <div className="px-2.5 py-1 text-xs text-muted-foreground">
                {filtered.length} de {allEntries.length} modelos
              </div>
              {filtered.map((entry) => {
                const isSelected =
                  activeConnectorId === entry.connectorId &&
                  activeConnector?.model === entry.modelId

                return (
                  <button
                    key={`${entry.connectorId}-${entry.modelId}`}
                    type="button"
                    onClick={() => {
                      setActiveConnectorId(entry.connectorId)
                      setConnectors((prev) =>
                        prev.map((c) =>
                          c.id === entry.connectorId
                            ? { ...c, model: entry.modelId }
                            : c
                        )
                      )
                      setOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent/60 font-medium"
                    )}
                  >
                    <CheckIcon
                      className={cn(
                        "size-4 shrink-0 transition-opacity",
                        isSelected ? "opacity-100 text-primary" : "opacity-0"
                      )}
                    />
                    <div className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                      <ProviderBrandIcon
                        providerId={entry.connectorId}
                        className="size-3"
                      />
                    </div>
                    <span className="min-w-0 flex-1 truncate">
                      {entry.modelId}
                    </span>
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {entry.connectorName}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
