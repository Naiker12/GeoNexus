import * as React from "react"
import {
  SearchIcon,
  CheckIcon,
  PlusIcon,
  BotIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useConnectors } from "@/contexts/ConnectorsContext"
import { ProviderBrandIcon } from "@/features/workspace/ai-containers/ProviderBrandIcon"
import { cn } from "@/lib/utils"

export function ModelHeaderPopover() {
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

  const hasModel = !!(
    activeConnector &&
    activeConnector.model !== "Sin modelo" &&
    activeConnector.models.length > 0
  )

  const triggerLabel = hasModel
    ? `${activeConnector.name} - ${activeConnector.model}`
    : "Sin modelo configurado"

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="xs"
          className="h-[22px] rounded-full border border-border/70 bg-muted/45 hover:bg-muted/65 px-2 py-0 gap-1 text-[10px] font-medium text-foreground/85 shadow-xs transition-all"
          aria-label="Configurar modelo"
          title="Configurar modelo"
        >
          <span className={cn("size-1.5 rounded-full", hasModel ? "bg-emerald-500 animate-pulse" : "bg-amber-400")} />
          <BotIcon className="size-2.5 text-muted-foreground" />
          <span className="max-w-40 truncate">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="w-72 overflow-hidden rounded-xl p-0 border border-border bg-background shadow-lg"
      >
        {/* Input de búsqueda */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-muted/20">
          <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar modelos..."
            className="w-full bg-transparent text-[11px] outline-none placeholder:text-muted-foreground text-foreground"
            autoFocus
          />
        </div>

        {/* Lista de modelos */}
        <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 [scrollbar-width:thin]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-6 text-center text-[11px] text-muted-foreground">
              <SearchIcon className="size-4 opacity-30" />
              <span>
                {allEntries.length === 0
                  ? "No hay modelos disponibles"
                  : "No se encontraron modelos"}
              </span>
            </div>
          ) : (
            filtered.map((entry) => {
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
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent/60 font-semibold text-foreground"
                  )}
                >
                  <CheckIcon
                    className={cn(
                      "size-3.5 shrink-0 transition-opacity",
                      isSelected ? "opacity-100 text-primary" : "opacity-0"
                    )}
                  />
                  <div className="flex size-4.5 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                    <ProviderBrandIcon
                      providerId={entry.connectorId}
                      className="size-3"
                    />
                  </div>
                  <span className="min-w-0 flex-1 truncate">
                    {entry.modelId}
                  </span>
                  <span className="shrink-0 rounded bg-muted/60 px-1.5 py-0.5 text-[9px] text-muted-foreground font-medium">
                    {entry.connectorName}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {/* Acciones de pie */}
        <div className="border-t border-border p-1.5 bg-muted/10 flex items-center justify-between">
          <Button
            variant="ghost"
            size="xs"
            className="w-full gap-1 text-[10px] font-medium h-7 justify-center hover:bg-accent/60"
            onClick={() => {
              setOpen(false)
              window.location.hash = "#mcp"
            }}
          >
            <PlusIcon className="size-3" />
            Configurar proveedores
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
