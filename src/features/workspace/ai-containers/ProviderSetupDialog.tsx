import { KeyRoundIcon, PlugZapIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AiConnector } from "@/features/workspace/workspace-data"
import type { ProviderOption } from "@/features/workspace/ai-containers/provider-options"
import { ProviderBrandIcon } from "@/features/workspace/ai-containers/ProviderBrandIcon"

type ProviderSetupDialogProps = {
  option: ProviderOption | null
  connector?: AiConnector
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProviderSetupDialog({
  option,
  connector,
  open,
  onOpenChange,
}: ProviderSetupDialogProps) {
  if (!option) {
    return null
  }

  const needsKey = option.auth === "api-key"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,36rem)] rounded-lg p-0">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ProviderBrandIcon
                providerId={option.id}
                fallback={option.icon}
                className="size-4"
              />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">{option.name}</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5">
                {needsKey
                  ? "La API key se debe guardar en el keychain del sistema, nunca en SQLite."
                  : "Configura el endpoint local y prueba la conexion antes de activar el proveedor."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form className="grid gap-4 p-4">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <FormField
              label="Nombre"
              placeholder={option.name}
              defaultValue={connector?.name ?? option.name}
            />
            <FormField
              label="Modelo"
              placeholder={option.defaultModel}
              defaultValue={connector?.model ?? option.defaultModel}
            />
            <FormField
              label="Endpoint"
              placeholder={option.defaultEndpoint}
              defaultValue={connector?.endpoint ?? option.defaultEndpoint}
            />
            {needsKey ? (
              <FormField label="API key" placeholder="sk-..." type="password" />
            ) : (
              <FormField
                label="Puerto local"
                placeholder="11434"
                defaultValue={getPort(option.defaultEndpoint)}
              />
            )}
          </div>

          <label className="grid gap-1.5 text-sm font-medium">
            Modelo activo
            <select className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition focus:border-primary/50 focus:ring-3 focus:ring-ring/30">
              {option.models.map((model) => (
                <option key={model}>{model}</option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-border bg-muted/45 px-3 py-2.5 text-sm leading-5 text-muted-foreground">
            {option.type === "local"
              ? "GeoNexus intentara detectar este proveedor con ping local al iniciar el sidecar."
              : "Al guardar, GeoNexus debe persistir la configuracion LLM y referenciar la key segura desde Tauri Stronghold."}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-between">
            <Button variant="outline" size="sm" type="button">
              <PlugZapIcon className="size-4" />
              Probar conexion
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
              <Button size="sm" type="submit">
                <KeyRoundIcon className="size-4" />
                Guardar proveedor
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormField({
  label,
  placeholder,
  type = "text",
  defaultValue,
}: {
  label: string
  placeholder: string
  type?: string
  defaultValue?: string
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        type={type}
        defaultValue={defaultValue}
        className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition focus:border-primary/50 focus:ring-3 focus:ring-ring/30"
        placeholder={placeholder}
      />
    </label>
  )
}

function getPort(endpoint: string) {
  return endpoint.match(/:(\d+)/)?.[1] ?? ""
}
