import * as React from "react"

import { pingLlmProvider } from "@/api/llm"
import { useToast } from "@/components/ui/toast"
import { useConnectors } from "@/contexts/ConnectorsContext"
import { ActiveProviderPanel } from "@/features/workspace/ai-containers/ActiveProviderPanel"
import { AiContainersHeader } from "@/features/workspace/ai-containers/AiContainersHeader"
import { ConfiguredProvidersList } from "@/features/workspace/ai-containers/ConfiguredProvidersList"
import { ProviderMasterDialog } from "@/features/workspace/ai-containers/ProviderMasterDialog"
import {
  type ProviderOption,
  providerOptions,
} from "@/features/workspace/ai-containers/provider-options"
import type { AiConnector } from "@/types/workspace-types"

export function AiContainersPage() {
  const { toast } = useToast()
  const {
    connectors: configuredConnectors,
    setConnectors: setConfiguredConnectors,
    activeConnectorId,
    setActiveConnectorId,
  } = useConnectors()
  const [masterDialogOpen, setMasterDialogOpen] = React.useState(false)
  const [selectedProviderId, setSelectedProviderId] = React.useState<string>("ollama")
  const [testingProviderId, setTestingProviderId] = React.useState<string | null>(null)

  const handleConfig = (option: ProviderOption) => {
    setSelectedProviderId(option.id)
    setMasterDialogOpen(true)
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
        description: "Configura endpoint y modelo antes de probar la conexión.",
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
        title: result.status === "ok" ? "Proveedor conectado" : "No se pudo conectar",
        description:
          result.status === "ok"
            ? `${connector.name} respondió correctamente.`
            : (result.message ?? "Revisa endpoint, modelo o servicio local."),
        variant: result.status === "ok" ? "success" : "error",
      })
    } catch (error) {
      const errorMsg =
        typeof error === "string" ? error : error instanceof Error ? error.message : String(error)

      toast({
        title: "Prueba no disponible",
        description: errorMsg,
        variant: "error",
      })
    } finally {
      setTestingProviderId(null)
    }
  }

  const handleAddProvider = () => {
    setSelectedProviderId("ollama")
    setMasterDialogOpen(true)
  }

  const handleConnectApi = () => {
    setSelectedProviderId("custom-api")
    setMasterDialogOpen(true)
  }

  const handleSaveConnector = async (connector: AiConnector, activateNow = true) => {
    setConfiguredConnectors((current) => [
      connector,
      ...current.filter((item) => item.id !== connector.id),
    ])
    if (activateNow) {
      setActiveConnectorId(connector.id)
    }
  }

  const handleDeleteProvider = (option: ProviderOption) => {
    setConfiguredConnectors((current) => current.filter((item) => item.id !== option.id))
    if (activeConnectorId === option.id) {
      setActiveConnectorId(null)
    }
    toast({
      title: "Proveedor eliminado",
      description: `${option.name} se ha eliminado de la configuración.`,
      variant: "success",
    })
  }

  const handleModelChange = (model: string) => {
    if (!activeConnectorId) return

    setConfiguredConnectors((current) =>
      current.map((item) => (item.id === activeConnectorId ? { ...item, model } : item))
    )
  }

  const handleModelDelete = (model: string) => {
    if (!activeConnectorId) return

    setConfiguredConnectors((current) =>
      current.map((item) =>
        item.id === activeConnectorId
          ? {
              ...item,
              models: item.models?.filter((m) => m !== model) || [],
              model: item.model === model ? "Sin modelo" : item.model,
            }
          : item
      )
    )
  }

  const activeConnector = activeConnectorId
    ? configuredConnectors.find((c) => c.id === activeConnectorId)
    : undefined

  const isTestingActiveProvider = testingProviderId === activeProvider?.id

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-4 py-4 sm:px-6 sm:py-5 [scrollbar-width:thin]">
      <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-5">
        <AiContainersHeader
          connectors={configuredConnectors}
          onAddProvider={handleAddProvider}
          onConnectApi={handleConnectApi}
        />

        <div className="rounded-2xl border border-border/70 bg-card/80 px-4 py-2.5 text-xs text-muted-foreground shadow-2xs">
          🔒 Las credenciales y claves API se almacenan de forma segura localmente en tu sistema.
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <ConfiguredProvidersList
            options={providerOptions}
            connectors={configuredConnectors}
            testingProviderId={testingProviderId}
            onConfig={handleConfig}
            onTest={handleTest}
            onDelete={handleDeleteProvider}
          />

          <div className="sticky top-0">
            <ActiveProviderPanel
              activeOption={activeProvider}
              activeConnector={activeConnector}
              isTesting={isTestingActiveProvider}
              onModelChange={handleModelChange}
              onModelDelete={handleModelDelete}
            />
          </div>
        </div>
      </div>

      {/* ─── Diálogo Unificado Master-Detail con Pestañas (Sin Diálogos Anidados) ─── */}
      <ProviderMasterDialog
        open={masterDialogOpen}
        onOpenChange={setMasterDialogOpen}
        initialSelectedId={selectedProviderId}
        configuredConnectors={configuredConnectors}
        onSaveConnector={handleSaveConnector}
      />
    </section>
  )
}
