import { BotIcon, CheckIcon, ChevronDownIcon, PlusIcon, SearchIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/Button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useConnectors } from "@/contexts/ConnectorsContext"
import { ProviderBrandIcon } from "@/features/workspace/ai-containers/ProviderBrandIcon"
import { useLanguage } from "@/i18n/useLanguage"
import { cn } from "@/lib/utils"

export function ModelHeaderPopover() {
  const { t } = useLanguage()
  const { connectors, activeConnectorId, setActiveConnectorId, setConnectors } = useConnectors()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const activeConnector = activeConnectorId
    ? connectors.find((c) => c.id === activeConnectorId)
    : null

  const hasModel = !!(
    activeConnector &&
    activeConnector.model &&
    activeConnector.model !== "Sin modelo" &&
    activeConnector.models.length > 0
  )

  const activeModelName = hasModel ? activeConnector.model : t.topbar.selectModel
  const activeFormat = hasModel
    ? activeConnector.provider === "local"
      ? "Local"
      : "Cloud"
    : ""

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
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl px-2.5 py-1 text-xs text-foreground/90 hover:text-foreground hover:bg-muted/50 transition-all font-sans group cursor-pointer"
          aria-label="Seleccionar modelo activo"
          title="Seleccionar modelo activo"
        >
          <span
            className={cn(
              "size-2 rounded-full shrink-0",
              hasModel
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                : "bg-amber-500/70"
            )}
          />
          <span className="font-bold text-[13px] tracking-tight text-foreground">
            {activeModelName}
          </span>
          {activeFormat && (
            <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline-block">
              · {activeFormat}
            </span>
          )}
          <ChevronDownIcon className="size-3 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-80 overflow-hidden rounded-2xl p-0 border border-border/80 bg-popover/95 backdrop-blur-md shadow-xl"
      >
        {/* Input de búsqueda */}
        <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5 bg-muted/20">
          <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.topbar.searchPlaceholder}
            className="w-full bg-transparent text-xs outline-hidden placeholder:text-muted-foreground/70 text-foreground font-medium"
          />
        </div>

        {/* Lista de modelos */}
        <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 [scrollbar-width:thin]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-8 text-center text-xs text-muted-foreground">
              <BotIcon className="size-5 opacity-40 mb-1" />
              <span className="font-medium">
                {allEntries.length === 0
                  ? t.topbar.noModels
                  : "No se encontraron resultados"}
              </span>
            </div>
          ) : (
            filtered.map((entry) => {
              const isSelected =
                activeConnectorId === entry.connectorId && activeConnector?.model === entry.modelId

              return (
                <button
                  key={`${entry.connectorId}-${entry.modelId}`}
                  type="button"
                  onClick={() => {
                    setActiveConnectorId(entry.connectorId)
                    setConnectors((prev) =>
                      prev.map((c) =>
                        c.id === entry.connectorId ? { ...c, model: entry.modelId } : c
                      )
                    )
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted/70 cursor-pointer",
                    isSelected && "bg-muted font-semibold text-foreground"
                  )}
                >
                  <CheckIcon
                    className={cn(
                      "size-3.5 shrink-0 transition-opacity",
                      isSelected ? "opacity-100 text-primary" : "opacity-0"
                    )}
                  />
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-muted border border-border/60 text-muted-foreground">
                    <ProviderBrandIcon providerId={entry.connectorId} className="size-3" />
                  </div>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {entry.modelId}
                  </span>
                  <span className="shrink-0 rounded-md bg-muted/80 border border-border/60 px-1.5 py-0.2 text-[10px] text-muted-foreground font-mono">
                    {entry.connectorName}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {/* Acciones de pie */}
        <div className="border-t border-border/60 p-2 bg-muted/10">
          <Button
            variant="ghost"
            size="xs"
            className="w-full gap-1.5 text-xs font-medium h-7.5 justify-center hover:bg-muted rounded-xl"
            onClick={() => {
              setOpen(false)
              window.dispatchEvent(new CustomEvent("geonexus:open-settings"))
            }}
          >
            <PlusIcon className="size-3.5" />
            <span>{t.topbar.configureAi}</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
