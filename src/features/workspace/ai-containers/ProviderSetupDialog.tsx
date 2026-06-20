import { AlertTriangleIcon, CheckIcon, ChevronDownIcon, KeyRoundIcon, RefreshCwIcon, SearchIcon } from "lucide-react"
import * as React from "react"

import { listLlmModels } from "@/api/llm"
import { Button } from "@/components/ui/Button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ProviderBrandIcon } from "@/features/workspace/ai-containers/ProviderBrandIcon"
import type { ProviderOption } from "@/features/workspace/ai-containers/provider-options"
import type { AiConnector } from "@/types/workspace-types"
import type { LlmModelInfo } from "@/types/llm"
import { cn } from "@/lib/utils"

type ProviderSetupDialogProps = {
  option: ProviderOption | null
  connector?: AiConnector
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (payload: {
    providerName: string
    model: string
    endpoint: string
    apiKey?: string
    hasApiKey: boolean
    allModels: string[]
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
  const [selectedModelId, setSelectedModelId] = React.useState("")
  const [endpoint, setEndpoint] = React.useState("")
  const [apiKey, setApiKey] = React.useState("")
  const [models, setModels] = React.useState<LlmModelInfo[]>([])
  const [loadingModels, setLoadingModels] = React.useState(false)
  const [modelsError, setModelsError] = React.useState<string | null>(null)

  const needsKey = option?.auth === "api-key"

  const fetchModels = React.useCallback(async () => {
    const providerId = option?.id
    if (!providerId || !endpoint.trim()) {
      setModelsError("Completa el endpoint antes de probar la conexion")
      return
    }

    if (needsKey && !apiKey.trim()) {
      setModelsError("Ingresa la API key antes de probar la conexion")
      return
    }

    setLoadingModels(true)
    setModelsError(null)
    setModels([])
    setSelectedModelId("")

    try {
      const result = await listLlmModels({
        provider: providerId,
        endpoint: endpoint.trim(),
        apiKey: apiKey.trim() || null,
      })
      setModels(result)
      if (result.length === 1) {
        setSelectedModelId(result[0].id)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("ProviderSetupDialog: error al obtener modelos:", err)
      setModelsError(message)
    } finally {
      setLoadingModels(false)
    }
  }, [option?.id, endpoint, apiKey, needsKey])

  // Reset cuando se abre el diálogo
  React.useEffect(() => {
    if (!open || !option) return

    const nextName = connector?.name ?? option.name
    const nextModel = model_or_empty(connector?.model ?? option.defaultModel)
    const nextEndpoint = endpoint_or_default(connector?.endpoint, option.defaultEndpoint)

    setProviderName(nextName)
    setSelectedModelId(nextModel)
    setEndpoint(nextEndpoint)
    setApiKey("")
    setModels([])
    setModelsError(null)
  }, [connector, open, option])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!option) return

    onSave({
      providerName: providerName || option.name,
      model: selectedModelId,
      endpoint,
      apiKey: apiKey.trim() || undefined,
      hasApiKey: Boolean(apiKey),
      allModels: models.map((m) => m.id),
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Modelo</label>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchModels}
              disabled={loadingModels}
              className="w-full"
            >
              {loadingModels ? (
                <>
                  <RefreshCwIcon className="size-3.5 animate-spin" />
                  Probando conexion...
                </>
              ) : (
                <>
                  <RefreshCwIcon className="size-3.5" />
                  Probar conexion y cargar modelos
                </>
              )}
            </Button>

            {modelsError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{modelsError}</span>
              </div>
            )}

            {loadingModels && models.length === 0 && !modelsError && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <RefreshCwIcon className="h-3.5 w-3.5 animate-spin" />
                <span>Consultando {option?.name}...</span>
              </div>
            )}

            {models.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">
                  {models.length} modelo{models.length !== 1 ? "s" : ""} encontrado{models.length !== 1 ? "s" : ""}. Selecciona el que quieras usar:
                </p>
                <ModelCombobox
                  key={models.length > 0 ? "loaded" : "empty"}
                  models={models}
                  value={selectedModelId}
                  onChange={setSelectedModelId}
                />
              </>
            )}

            {!modelsError && models.length === 0 && !loadingModels && endpoint.trim() && (
              <p className="text-xs text-muted-foreground">
                Presiona "Probar conexion" para cargar los modelos disponibles.
              </p>
            )}

            {!modelsError && models.length === 0 && !loadingModels && !endpoint.trim() && (
              <p className="text-xs text-muted-foreground">
                Ingresa el endpoint y presiona "Probar conexion" para cargar modelos.
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
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
              type="submit"
            >
              <KeyRoundIcon className="size-4" />
              Guardar proveedor
            </Button>
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

function ModelCombobox({
  models,
  value,
  onChange,
}: {
  models: LlmModelInfo[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = React.useState(true)
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selected = models.find((m) => m.id === value)

  const filtered = React.useMemo(
    () =>
      query
        ? models.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
        : models,
    [models, query]
  )

  React.useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      setQuery("")
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selected ? (
            <div className="flex w-full items-center justify-between gap-2 min-w-0">
              <span className="truncate font-medium">{selected.name}</span>
              <div className="flex shrink-0 items-center gap-1.5">
                {selected.isFree === true && (
                  <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                    free
                  </span>
                )}
                {selected.contextLength != null && (
                  <span className="text-[10px] text-muted-foreground">
                    {selected.contextLength >= 1000
                      ? `${Math.round(selected.contextLength / 1000)}k`
                      : `${selected.contextLength}`}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">Buscar y seleccionar modelo...</span>
          )}
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) overflow-hidden rounded-lg p-0" align="start">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar modelos..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-8 text-center text-sm text-muted-foreground">
              <SearchIcon className="size-5 opacity-30" />
              <span>No se encontraron modelos con ese nombre</span>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              <div className="px-2 py-1 text-xs text-muted-foreground">
                {filtered.length} de {models.length} modelos
              </div>
              {filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onChange(m.id === value ? "" : m.id)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                    value === m.id && "bg-accent/60 font-medium"
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <CheckIcon
                      className={cn(
                        "size-4 shrink-0 transition-opacity",
                        value === m.id ? "opacity-100 text-primary" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{m.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {m.isFree === true && (
                      <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
                        free
                      </span>
                    )}
                    {m.contextLength != null && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {m.contextLength >= 1000
                          ? `${Math.round(m.contextLength / 1000)}k`
                          : `${m.contextLength}`}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function model_or_empty(value?: string) {
  return value && value !== "Sin modelo" ? value : ""
}

function endpoint_or_default(value: string | undefined, fallback: string) {
  if (value && value !== "Sin endpoint") return value
  return fallback
}
