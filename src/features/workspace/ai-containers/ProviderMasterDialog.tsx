import * as React from "react"
import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CheckIcon,
  CloudIcon,
  CpuIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  HelpCircleIcon,
  InfoIcon,
  KeyRoundIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  ServerIcon,
  SparklesIcon,
  TerminalIcon,
  XCircleIcon,
  ZapIcon,
} from "lucide-react"

import { pingLlmProvider } from "@/api/llm"
import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { ProviderBrandIcon } from "@/features/workspace/ai-containers/ProviderBrandIcon"
import {
  providerOptions,
  type ProviderCategory,
  type ProviderOption,
} from "@/features/workspace/ai-containers/provider-options"
import { cn } from "@/lib/utils"
import type { AiConnector } from "@/types/workspace-types"

type ProviderMasterDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSelectedId?: string
  configuredConnectors: AiConnector[]
  onSaveConnector: (connector: AiConnector, activateNow?: boolean) => Promise<void>
}

export function ProviderMasterDialog({
  open,
  onOpenChange,
  initialSelectedId = "ollama",
  configuredConnectors,
  onSaveConnector,
}: ProviderMasterDialogProps) {
  const { toast } = useToast()
  const [selectedId, setSelectedId] = React.useState(initialSelectedId)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<ProviderCategory>("all")
  const [showApiKey, setShowApiKey] = React.useState(false)

  // Current Form State
  const [customName, setCustomName] = React.useState("")
  const [endpoint, setEndpoint] = React.useState("")
  const [apiKey, setApiKey] = React.useState("")
  const [model, setModel] = React.useState("")
  const [activateNow, setActivateNow] = React.useState(true)

  // Test & Save State
  const [testing, setTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{
    status: "idle" | "ok" | "error"
    latency?: number
    message?: string
  }>({ status: "idle" })
  const [saving, setSaving] = React.useState(false)

  const selectedProvider = React.useMemo(() => {
    return providerOptions.find((p) => p.id === selectedId) || providerOptions[0]
  }, [selectedId])

  // Sync with selected provider or existing connector configuration
  React.useEffect(() => {
    const existing = configuredConnectors.find((c) => c.id === selectedProvider.id)
    if (existing) {
      setCustomName(existing.name)
      setEndpoint(existing.endpoint)
      setModel(existing.model === "Sin modelo" ? selectedProvider.defaultModel : existing.model)
    } else {
      setCustomName(selectedProvider.name)
      setEndpoint(selectedProvider.defaultEndpoint)
      setModel(selectedProvider.defaultModel)
    }
    setApiKey("")
    setShowApiKey(false)
    setTestResult({ status: "idle" })
  }, [selectedProvider, configuredConnectors])

  const filteredProviders = React.useMemo(() => {
    return providerOptions.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.popularModels.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesCat =
        categoryFilter === "all" ||
        (categoryFilter === "local" && p.category === "local") ||
        (categoryFilter === "cloud" && p.category === "cloud") ||
        (categoryFilter === "gateway" && p.category === "gateway") ||
        (categoryFilter === "custom" && p.category === "custom")

      return matchesSearch && matchesCat
    })
  }, [searchQuery, categoryFilter])

  const handleTestConnection = async () => {
    if (!endpoint) {
      toast({
        title: "Endpoint requerido",
        description: "Por favor ingresa la URL o endpoint del proveedor.",
        variant: "warning",
      })
      return
    }

    setTesting(true)
    setTestResult({ status: "idle" })

    try {
      const res = await pingLlmProvider({
        provider_type: selectedProvider.id,
        name: customName || selectedProvider.name,
        endpoint,
        model: model || undefined,
        api_key: apiKey || undefined,
      })

      if (res.status === "ok") {
        setTestResult({
          status: "ok",
          latency: res.latency_ms,
          message: `Conexión exitosa (${res.latency_ms || 45}ms).`,
        })
      } else {
        setTestResult({
          status: "error",
          message: res.message || "No se pudo conectar con el endpoint.",
        })
      }
    } catch (err) {
      setTestResult({
        status: "error",
        message: String(err),
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!endpoint) {
      toast({
        title: "Endpoint requerido",
        description: "Por favor completa el endpoint del proveedor.",
        variant: "warning",
      })
      return
    }

    setSaving(true)
    try {
      const connector: AiConnector = {
        id: selectedProvider.id,
        name: customName.trim() || selectedProvider.name,
        endpoint: endpoint.trim(),
        model: model.trim() || "default",
        status: testResult.status === "ok" ? "online" : "offline",
        latency: testResult.latency ? `${testResult.latency}ms` : "-",
      }

      await onSaveConnector(connector, activateNow)
      toast({
        title: "Proveedor guardado",
        description: `${connector.name} se ha configurado y está listo para usar.`,
        variant: "success",
      })
      onOpenChange(false)
    } catch (e) {
      toast({
        title: "Error al guardar",
        description: String(e),
        variant: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(88vh,780px)] w-[min(96vw,1080px)] max-w-6xl flex-col overflow-hidden rounded-3xl p-0 border border-border/80 bg-background shadow-2xl">
        <DialogTitle className="sr-only">Configurar Proveedores IA</DialogTitle>

        {/* ─── Encabezado Principal ─── */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-muted/15 px-6 py-4">
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
              Proveedores de Inteligencia Artificial
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conecta modelos locales (Ollama, LM Studio, vLLM) o APIs comerciales (OpenAI, Anthropic, Gemini, DeepSeek, Groq).
            </p>
          </div>
        </div>

        {/* ─── Master-Detail Layout (Pestañas Izquierda + Configuración Derecha) ─── */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* ─── Panel Izquierdo: Buscador & Lista de Proveedores ─── */}
          <div className="flex w-72 sm:w-80 shrink-0 flex-col border-r border-border/70 bg-muted/20">
            {/* Buscador */}
            <div className="p-3 border-b border-border/60">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar proveedor o modelo..."
                  className="w-full rounded-xl border border-border/70 bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary/60"
                />
              </div>

              {/* Filtros de Categoría */}
              <div className="flex items-center gap-1 mt-2 overflow-x-auto [scrollbar-width:none]">
                {(
                  [
                    { id: "all", label: "Todos" },
                    { id: "local", label: "Locales" },
                    { id: "cloud", label: "Cloud" },
                    { id: "gateway", label: "Gateways" },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={cn(
                      "rounded-lg px-2 py-0.5 text-[10px] font-medium transition-colors whitespace-nowrap",
                      categoryFilter === cat.id
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Proveedores */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 [scrollbar-width:thin]">
              {filteredProviders.map((p) => {
                const isSelected = p.id === selectedId
                const isConfigured = configuredConnectors.some((c) => c.id === p.id)

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      "group flex w-full items-center gap-2.5 rounded-2xl p-2.5 text-left transition-all",
                      isSelected
                        ? "bg-card text-foreground shadow-xs border border-border/80 font-semibold"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground border border-border/60">
                      <ProviderBrandIcon providerId={p.id} fallback={p.icon} className="size-4.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-semibold">{p.name}</span>
                        {isConfigured && (
                          <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" title="Configurado" />
                        )}
                      </div>
                      <span className="truncate text-[10px] text-muted-foreground block">
                        {p.category === "local" ? "Local Offline" : p.category === "gateway" ? "Multi-Modelo" : "API Cloud"}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ─── Panel Derecho: Detalle y Configuración del Proveedor ─── */}
          <div className="flex flex-1 flex-col overflow-y-auto p-6 [scrollbar-width:thin] space-y-5">
            {/* Header del Proveedor Seleccionado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground border border-border/70 shadow-2xs">
                  <ProviderBrandIcon
                    providerId={selectedProvider.id}
                    fallback={selectedProvider.icon}
                    className="size-6"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground tracking-tight">
                      {selectedProvider.name}
                    </h3>
                    <span className="rounded-full bg-muted border border-border/70 px-2 py-0.2 text-[10px] font-mono font-medium text-muted-foreground">
                      {selectedProvider.auth === "api-key" ? "API Key requerida" : "Sin API Key"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedProvider.description}
                  </p>
                </div>
              </div>

              {selectedProvider.docsUrl && (
                <a
                  href={selectedProvider.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-border/70 bg-card px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors self-start shrink-0"
                >
                  <span>Documentación Oficial</span>
                  <ExternalLinkIcon className="size-3" />
                </a>
              )}
            </div>

            {/* Quick Guide / Instrucciones Rápidas */}
            {selectedProvider.quickGuide && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground flex items-start gap-2.5">
                <InfoIcon className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5 text-primary">Cómo conectar:</span>
                  <span className="text-muted-foreground">{selectedProvider.quickGuide}</span>
                </div>
              </div>
            )}

            {/* Formulario de Configuración */}
            <div className="space-y-4">
              {/* Nombre de la conexión */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Nombre de la Conexión
                </label>
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={selectedProvider.name}
                  className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-primary/60"
                />
              </div>

              {/* Endpoint / Base URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    Endpoint / Base URL
                  </label>
                  {endpoint !== selectedProvider.defaultEndpoint && (
                    <button
                      type="button"
                      onClick={() => setEndpoint(selectedProvider.defaultEndpoint)}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Restablecer por defecto
                    </button>
                  )}
                </div>
                <input
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder={selectedProvider.defaultEndpoint}
                  className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-hidden focus:border-primary/60"
                />
              </div>

              {/* API Key (si aplica) */}
              {selectedProvider.auth !== "none" && (
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    API Key {selectedProvider.auth === "optional" && "(Opcional)"}
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 pr-9 text-xs font-mono text-foreground focus:outline-hidden focus:border-primary/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Modelo Predeterminado */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Modelo Predeterminado
                </label>
                <input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={selectedProvider.defaultModel || "Nombre del modelo (ej. llama3.3, gpt-4o)"}
                  className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-mono text-foreground focus:outline-hidden focus:border-primary/60"
                />

                {/* Modelos Populares / Accesos Rápidos */}
                {selectedProvider.popularModels.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-medium mr-1">
                      Sugeridos:
                    </span>
                    {selectedProvider.popularModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModel(m)}
                        className={cn(
                          "rounded-lg border px-2 py-0.5 text-[10px] font-mono transition-colors",
                          model === m
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Checkbox Activar como proveedor activo */}
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activateNow}
                  onChange={(e) => setActivateNow(e.target.checked)}
                  className="size-4 accent-primary rounded cursor-pointer"
                />
                <span className="text-xs text-foreground font-medium">
                  Establecer como proveedor activo principal para el Chat
                </span>
              </label>
            </div>

            {/* Resultado de la Prueba de Conexión */}
            {testResult.status !== "idle" && (
              <div
                className={cn(
                  "rounded-2xl p-3 text-xs flex items-center gap-2.5",
                  testResult.status === "ok"
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border border-destructive/30 bg-destructive/10 text-destructive"
                )}
              >
                {testResult.status === "ok" ? (
                  <CheckCircle2Icon className="size-4 shrink-0" />
                ) : (
                  <XCircleIcon className="size-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Footer de Acciones ─── */}
        <div className="flex shrink-0 items-center justify-between border-t border-border/70 bg-muted/15 px-6 py-3.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={testing}
            className="rounded-xl text-xs gap-1.5"
          >
            {testing ? <Loader2Icon className="size-3.5 animate-spin" /> : <RefreshCwIcon className="size-3.5" />}
            <span>Probar Conexión</span>
          </Button>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl text-xs font-semibold px-4"
            >
              {saving ? <Loader2Icon className="size-3.5 animate-spin mr-1.5" /> : null}
              <span>Guardar Proveedor</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
