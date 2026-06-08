import {
  ArrowRightIcon,
  BotIcon,
  CloudIcon,
  KeyRoundIcon,
  ServerIcon,
  TerminalIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProviderBrandIcon } from "@/features/workspace/ai-containers/ProviderBrandIcon"
import type { ProviderOption } from "@/features/workspace/ai-containers/provider-options"

type ProviderCatalogDialogProps = {
  open: boolean
  options: ProviderOption[]
  onOpenChange: (open: boolean) => void
  onSelect: (option: ProviderOption) => void
}

const typeMeta = {
  local: { label: "Local", icon: TerminalIcon },
  cloud: { label: "Cloud", icon: CloudIcon },
  mcp: { label: "MCP", icon: ServerIcon },
  custom: { label: "Custom", icon: BotIcon },
}

export function ProviderCatalogDialog({
  open,
  options,
  onOpenChange,
  onSelect,
}: ProviderCatalogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,48rem)] rounded-lg p-0">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <DialogTitle className="text-base">
            Agregar proveedor IA
          </DialogTitle>
          <DialogDescription className="text-sm">
            Selecciona una herramienta o proveedor para configurar endpoint,
            modelo y credenciales seguras.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[min(70vh,34rem)] gap-2 overflow-auto p-4 sm:grid-cols-2">
          {options.map((option) => {
            const TypeIcon = typeMeta[option.type].icon

            return (
              <button
                key={option.id}
                type="button"
                className="group grid gap-3 rounded-lg border border-border bg-card/70 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                onClick={() => onSelect(option)}
              >
                <span className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary ring-1 ring-border">
                    <ProviderBrandIcon
                      providerId={option.id}
                      fallback={option.icon}
                      className="size-4.5"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {option.name}
                      </span>
                      <ArrowRightIcon className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </span>

                <span className="flex flex-wrap gap-1.5">
                  <CatalogPill>
                    <TypeIcon className="size-3" />
                    {typeMeta[option.type].label}
                  </CatalogPill>
                  <CatalogPill>{option.role}</CatalogPill>
                  <CatalogPill>
                    <KeyRoundIcon className="size-3" />
                    {option.auth === "api-key" ? "API key" : "Sin key"}
                  </CatalogPill>
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex justify-end border-t border-border px-4 py-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CatalogPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-md bg-muted px-1.5 text-[0.68rem] text-muted-foreground">
      {children}
    </span>
  )
}
