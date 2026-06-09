import * as React from "react"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckIcon,
  PlusIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useConnectors } from "@/contexts/ConnectorsContext"

export function ModelHeaderPopover() {
  const { connectors, activeConnectorId } = useConnectors()
  const [open, setOpen] = React.useState(false)

  const activeConnector = activeConnectorId
    ? connectors.find((c) => c.id === activeConnectorId)
    : null

  const hasModel = !!(
    activeConnector &&
    activeConnector.model !== "Sin modelo" &&
    activeConnector.models.length > 0
  )

  const triggerLabel = hasModel
    ? `${activeConnector.name} — ${activeConnector.model}`
    : "Sin proveedor — Sin modelo"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="gap-1 text-[11px] font-normal text-muted-foreground hover:text-foreground h-6"
          aria-label="Configurar modelo"
          title="Configurar modelo"
        >
          <span className="max-w-36 truncate">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={4}
        className="w-64 overflow-hidden rounded-xl p-0"
      >
        <div className="space-y-2 p-3">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Modelo activo
          </h4>

          {hasModel ? (
            <div className="rounded-lg border border-border bg-muted/20 p-2 text-center text-[11px]">
              <CheckIcon className="mx-auto mb-0.5 size-3.5 text-green-500" />
              <p className="font-medium text-foreground">Modelo configurado</p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-2 text-center text-[11px] text-muted-foreground">
              <AlertTriangleIcon className="mx-auto mb-0.5 size-3.5 text-amber-400" />
              <p>Sin modelo configurado</p>
              <p className="mt-0.5 text-[10px]">Conecta un proveedor para habilitar</p>
            </div>
          )}

          <Button size="xs" className="w-full gap-1 text-[11px]" onClick={() => {
            setOpen(false)
            window.location.hash = "#contenedores-ia"
          }}>
            <PlusIcon className="size-3" />
            Agregar proveedor
          </Button>

          <button
            type="button"
            onClick={() => {
              setOpen(false)
              window.location.hash = "#contenedores-ia"
            }}
            className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <span>Cambiar modelo</span>
            <ArrowRightIcon className="size-2.5" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
