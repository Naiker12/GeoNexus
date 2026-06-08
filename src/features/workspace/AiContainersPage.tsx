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
import { aiConnectors, type AiConnector } from "@/features/workspace/workspace-data"
import { useToast } from "@/components/ui/toast"
import { pingLlmProvider } from "@/api/llm"

export function AiContainersPage() {
  const { toast } = useToast()
  const [configuredConnectors, setConfiguredConnectors] =
    React.useState<AiConnector[]>(aiConnectors)
  const [catalogOpen, setCatalogOpen] = React.useState(false)
  const [configDialogOpen, setConfigDialogOpen] = React.useState(false)
  const [setupOption, setSetupOption] = React.useState<ProviderOption | null>(
    null
  )
  const [activeProvider, setActiveProvider] =
    React.useState<ProviderOption | null>(null)
  const [testingProviderId, setTestingProviderId] = React.useState<
    string | null
  >(null)

  const handleConfig = (option: ProviderOption) => {
    setSetupOption(option)
    setConfigDialogOpen(true)
  }

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
    setActiveProvider(option)

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
      toast({
        title: "Prueba no disponible",
        description:
          error instanceof Error
            ? error.message
            : "No fue posible ejecutar ping_llm_provider.",
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
      models: payload.model ? [payload.model] : [],
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
    setActiveProvider(setupOption)
    setConfigDialogOpen(false)

    toast({
      title: "Proveedor preparado",
      description:
        "La configuracion quedo en memoria de UI. Falta persistir con Tauri/keychain para que sea real.",
      variant: "success",
    })
  }

  const setupConnector = setupOption
    ? configuredConnectors.find((c) => c.id === setupOption.id)
    : undefined

  const activeConnector = activeProvider
    ? configuredConnectors.find((c) => c.id === activeProvider.id)
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
