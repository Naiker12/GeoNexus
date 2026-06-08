import { KeyRoundIcon, PlugZapIcon } from "lucide-react"
import * as React from "react"

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
import type { AiConnector } from "@/features/workspace/workspace-data"

type ProviderSetupDialogProps = {
  option: ProviderOption | null
  connector?: AiConnector
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (payload: {
    providerName: string
    model: string
    endpoint: string
    hasApiKey: boolean
  }) => void
}

export function ProviderSetupDialog({
  option,
  connector,
  open,
  onOpenChange,
  onSave,
}: ProviderSetupDialogProps) {
  if (!option) {
    return null
  }

  const needsKey = option.auth === "api-key"

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const providerName = String(formData.get("providerName") ?? "").trim()
    const model = String(formData.get("model") ?? "").trim()
    const endpoint = String(formData.get("endpoint") ?? "").trim()
    const apiKey = String(formData.get("apiKey") ?? "").trim()

    onSave({
      providerName: providerName || option.name,
      model,
      endpoint,
      hasApiKey: Boolean(apiKey),
    })
  }

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

        <form className="grid gap-4 p-4" onSubmit={handleSubmit}>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <FormField
              label="Nombre"
              name="providerName"
              placeholder="Nombre del proveedor"
              defaultValue={connector?.name ?? option.name}
            />
            <FormField
              label="Modelo"
              name="model"
              placeholder="Modelo configurado"
              defaultValue={connector?.model}
            />
            <FormField
              label="Endpoint"
              name="endpoint"
              placeholder="Endpoint del proveedor"
              defaultValue={connector?.endpoint}
            />
            {needsKey ? (
              <FormField
                label="API key"
                name="apiKey"
                placeholder="API key"
                type="password"
              />
            ) : (
              <FormField
                label="Puerto local"
                name="localPort"
                placeholder="Puerto local"
              />
            )}
          </div>

          <label className="grid gap-1.5 text-sm font-medium">
            Modelo activo
            <select
              className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition focus:border-primary/50 focus:ring-3 focus:ring-ring/30"
              disabled
            >
              <option>Sin modelos detectados</option>
            </select>
          </label>

          <div className="rounded-lg border border-border bg-muted/45 px-3 py-2.5 text-sm leading-5 text-muted-foreground">
            Al guardar, GeoNexus debe persistir la configuracion LLM y usar
            keychain cuando exista clave segura.
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
  name,
  placeholder,
  type = "text",
  defaultValue,
}: {
  label: string
  name: string
  placeholder: string
  type?: string
  defaultValue?: string
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition focus:border-primary/50 focus:ring-3 focus:ring-ring/30"
        placeholder={placeholder}
      />
    </label>
  )
}
