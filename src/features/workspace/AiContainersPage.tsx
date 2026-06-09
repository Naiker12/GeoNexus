import * as React from "react"

import { ActiveProviderPanel } from "@/features/workspace/ai-containers/ActiveProviderPanel"
import { AiContainersHeader } from "@/features/workspace/ai-containers/AiContainersHeader"
import { ConfiguredProvidersList } from "@/features/workspace/ai-containers/ConfiguredProvidersList"
import { ProviderCatalogDialog } from "@/features/workspace/ai-containers/ProviderCatalogDialog"
import { ProviderSetupDialog } from "@/features/workspace/ai-containers/ProviderSetupDialog"
import {
  providerOptions,
  type ProviderOption,
} from "@/features/workspace/ai-containers/provider-options"
import type { AiConnector } from "@/features/workspace/workspace-data"
import { useToast } from "@/components/ui/toast"
import { pingLlmProvider } from "@/api/llm"
import { useConnectors } from "@/contexts/ConnectorsContext"

export function AiContainersPage() {
  const { toast } = useToast()
  const {
    connectors: configuredConnectors,
    setConnectors: setConfiguredConnectors,
    activeConnectorId,
    setActiveConnectorId,
  } = useConnectors()
  const [catalogOpen, setCatalogOpen] = React.useState(false)
  const [configDialogOpen, setConfigDialogOpen] = React.useState(false)
  const [setupOption, setSetupOption] = React.useState<ProviderOption | null>(
    null
  )
  const [testingProviderId, setTestingProviderId] = React.useState<
    string | null
  >(null)

  const handleConfig = (option: ProviderOption) => {
    setSetupOption(option)
    setConfigDialogOpen(true)
  }

  const activeProvider = React.useMemo(() => {
    if (!activeConnectorId) return null
    return providerOptions.find((p) => p.id === activeConnectorId) ?? null
  }, [activeConnectorId])

  const handleTest = async (option: ProviderOption) => {
    const connector = configuredConnectors.find((item) => item.id === option.id)
    if (!connector || connector.endpoint === "Sin endpoint") {
      toast({
        title: "Proveedor sin endpoint",
        description: "Configura endpoint y modelo antes de probar la conexion.",
        variant: "warning",
      })
      return
    }

    setTestingProviderId(option.id)

    try {
      const result = await pingLlmProvider({
        provider_type: option.id,
        name: connector.name,
        model: connector.model === "Sin modelo" ? undefined : connector.model,
        endpoint: connector.endpoint,
      })

      setConfiguredConnectors((current) =>
        current.map((item) =>
          item.id === connector.id
            ? {
                ...item,
                status: result.status === "ok" ? "online" : "offline",
                latency: result.latency_ms ? `${result.latency_ms}ms` : "-",
              }
            : item
        )
      )

      toast({
        title:
          result.status === "ok"
            ? "Proveedor conectado"
            : "No se pudo conectar",
        description:
          result.status === "ok"
            ? `${connector.name} respondio correctamente.`
            : result.message ?? "Revisa endpoint, modelo o servicio local.",
        variant: result.status === "ok" ? "success" : "error",
      })
    } catch (error) {
      const errorMsg = typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : String(error)

      const isTauriMissing =
        errorMsg.includes("Tauri") ||
        errorMsg.includes("backend") ||
        errorMsg.includes("invoke") ||
        errorMsg.includes("navigator") ||
        errorMsg.includes("__TAURI__")

      toast({
        title: "Prueba no disponible",
        description: isTauriMissing
          ? "Ejecuta 'npm run tauri dev' (no 'npm run dev') para usar el backend nativo"
          : errorMsg,
        variant: "error",
      })
    } finally {
      setTestingProviderId(null)
    }
  }

  const handleAddProvider = () => {
    setCatalogOpen(true)
  }

  const handleConnectApi = () => {
    setCatalogOpen(true)
  }

  const handleCatalogSelect = (option: ProviderOption) => {
    setCatalogOpen(false)
    handleConfig(option)
  }

  const handleSaveProvider = (payload: {
    providerName: string
    model: string
    endpoint: string
    hasApiKey: boolean
    allModels: string[]
  }) => {
    if (!setupOption) return

    const connector: AiConnector = {
      id: setupOption.id,
      name: payload.providerName,
      provider:
        setupOption.type === "custom"
          ? "cloud"
          : setupOption.type === "mcp"
            ? "mcp"
            : setupOption.type,
      role: setupOption.role === "tool-router" ? "tool-router" : setupOption.role,
      status: payload.hasApiKey || setupOption.auth !== "api-key" ? "offline" : "needs-key",
      model: payload.model || "Sin modelo",
      models: payload.allModels,
      endpoint: payload.endpoint || "Sin endpoint",
      supportsTools: setupOption.role === "tool-router",
      privacy: setupOption.auth === "api-key" ? "keychain" : "localhost",
      latency: "-",
      description: setupOption.description,
      icon: setupOption.icon,
    }

    setConfiguredConnectors((current) => [
      connector,
      ...current.filter((item) => item.id !== connector.id),
    ])
    setActiveConnectorId(setupOption.id)
    setConfigDialogOpen(false)

    toast({
      title: payload.model ? "Proveedor preparado" : "Proveedor agregado",
      description: payload.model
        ? "Proveedor configurado con modelo seleccionado."
        : "Proveedor agregado sin modelo. Selecciona uno desde el chat o vuelve a configurar.",
      variant: "success",
    })
  }

  const handleModelChange = (model: string) => {
    if (!activeConnectorId) return

    setConfiguredConnectors((current) =>
      current.map((item) =>
        item.id === activeConnectorId ? { ...item, model } : item
      )
    )
  }

  const setupConnector = setupOption
    ? configuredConnectors.find((c) => c.id === setupOption.id)
    : undefined

  const activeConnector = activeConnectorId
    ? configuredConnectors.find((c) => c.id === activeConnectorId)
    : undefined

  const isTestingActiveProvider = testingProviderId === activeProvider?.id

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-5">
        <AiContainersHeader
          connectors={configuredConnectors}
          onAddProvider={handleAddProvider}
          onConnectApi={handleConnectApi}
        />

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <ConfiguredProvidersList
            options={providerOptions}
            connectors={configuredConnectors}
            testingProviderId={testingProviderId}
            onConfig={handleConfig}
            onTest={handleTest}
          />

          <div className="sticky top-0">
            <ActiveProviderPanel
              activeOption={activeProvider}
              activeConnector={activeConnector}
              isTesting={isTestingActiveProvider}
              onModelChange={handleModelChange}
            />
          </div>
        </div>
      </div>

      <ProviderSetupDialog
        connector={setupConnector}
        open={configDialogOpen}
        option={setupOption}
        onOpenChange={setConfigDialogOpen}
        onSave={handleSaveProvider}
      />

      <ProviderCatalogDialog
        open={catalogOpen}
        options={providerOptions}
        onOpenChange={setCatalogOpen}
        onSelect={handleCatalogSelect}
      />
    </section>
  )
}
