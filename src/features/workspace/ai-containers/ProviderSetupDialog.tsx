import { KeyRoundIcon, PlugZapIcon, RefreshCwIcon } from "lucide-react"
import * as React from "react"

import { listLlmModels } from "@/api/llm"
import { Button } from "@/components/ui/Button"
import { NativeSelect } from "@/components/ui/native-select"
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
  const [providerName, setProviderName] = React.useState("")
  const [model, setModel] = React.useState("")
  const [endpoint, setEndpoint] = React.useState("")
  const [apiKey, setApiKey] = React.useState("")
  const [models, setModels] = React.useState<string[]>([])
  const [loadingModels, setLoadingModels] = React.useState(false)
  const [modelError, setModelError] = React.useState<string | null>(null)

  const needsKey = option?.auth === "api-key"

  React.useEffect(() => {
    if (!open || !option) return
    const nextName = connector?.name ?? option.name
    const nextModel = model_or_empty(connector?.model ?? option.defaultModel)
    const nextEndpoint = endpoint_or_default(connector?.endpoint, option.defaultEndpoint)

    setProviderName(nextName)
    setModel(nextModel)
    setEndpoint(nextEndpoint)
    setApiKey("")
    setModels(nextModel ? [nextModel] : option.models)
    setModelError(null)
  }, [connector, open, option])

  const handleLoadModels = async () => {
    if (!option) return

    const cleanEndpoint = endpoint.trim()
    if (!cleanEndpoint) {
      setModelError("Endpoint requerido para detectar modelos.")
      return
    }

    setLoadingModels(true)
    setModelError(null)

    try {
      const result = await listLlmModels({
        provider_type: option.id,
        endpoint: cleanEndpoint,
        api_key: apiKey.trim() || undefined,
      })

      if (result.status !== "ok") {
        setModels([])
        setModel("")
        setModelError(result.message ?? "No se pudieron detectar modelos.")
        return
      }

      setModels(result.models)
      if (result.models.length > 0) {
        setModel((current) =>
          current && result.models.includes(current) ? current : result.models[0]
        )
      } else {
        setModel("")
        setModelError("El proveedor respondio, pero no devolvio modelos.")
      }
    } catch (error) {
      setModels([])
      setModel("")
      setModelError(
        error instanceof Error
          ? error.message
          : "No fue posible probar el proveedor."
      )
    } finally {
      setLoadingModels(false)
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!option) return

    onSave({
      providerName: providerName || option.name,
      model,
      endpoint,
      hasApiKey: Boolean(apiKey),
    })
  }

  if (!option) {
    return null
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
              value={providerName}
              onChange={setProviderName}
            />
            <FormField
              label="Modelo"
              name="model"
              placeholder="Modelo configurado"
              value={model}
              onChange={setModel}
            />
            <FormField
              label="Endpoint"
              name="endpoint"
              placeholder="Endpoint del proveedor"
              value={endpoint}
              onChange={setEndpoint}
            />
            {needsKey ? (
              <FormField
                label="API key"
                name="apiKey"
                placeholder="API key"
                type="password"
                value={apiKey}
                onChange={setApiKey}
              />
            ) : (
              <FormField
                label="Puerto local"
                name="localPort"
                placeholder="Puerto local"
                value=""
                onChange={() => undefined}
              />
            )}
          </div>

          <div className="grid gap-1.5 text-sm font-medium">
            <div className="flex items-center justify-between gap-2">
              <span>Modelo activo</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadModels}
                disabled={loadingModels}
              >
                {loadingModels ? (
                  <RefreshCwIcon className="size-4 animate-spin" />
                ) : (
                  <PlugZapIcon className="size-4" />
                )}
                Probar y cargar
              </Button>
            </div>
            <NativeSelect
              value={model}
              onChange={(event) => setModel(event.target.value)}
              disabled={models.length === 0}
              className="h-9 rounded-lg"
            >
              {models.length > 0 ? (
                models.map((item) => <option key={item}>{item}</option>)
              ) : (
                <option value="">Sin modelos detectados</option>
              )}
            </NativeSelect>
            {modelError ? (
              <p className="text-xs leading-4 text-destructive">{modelError}</p>
            ) : null}
          </div>

          <div className="rounded-lg border border-border bg-muted/45 px-3 py-2.5 text-sm leading-5 text-muted-foreground">
            Al guardar, GeoNexus debe persistir la configuracion LLM y usar
            keychain cuando exista clave segura.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleLoadModels}
              disabled={loadingModels}
            >
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
  value,
  onChange,
}: {
  label: string
  name: string
  placeholder: string
  type?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition focus:border-primary/50 focus:ring-3 focus:ring-ring/30"
        placeholder={placeholder}
      />
    </label>
  )
}

function model_or_empty(value?: string) {
  return value && value !== "Sin modelo" ? value : ""
}

function endpoint_or_default(value: string | undefined, fallback: string) {
  if (value && value !== "Sin endpoint") return value
  return fallback
}
