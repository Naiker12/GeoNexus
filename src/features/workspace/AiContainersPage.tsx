import * as React from "react"

import { ActiveProviderPanel } from "@/features/workspace/ai-containers/ActiveProviderPanel"
import { AiContainersHeader } from "@/features/workspace/ai-containers/AiContainersHeader"
import { ConfiguredProvidersList } from "@/features/workspace/ai-containers/ConfiguredProvidersList"
import { ProviderSetupDialog } from "@/features/workspace/ai-containers/ProviderSetupDialog"
import {
  providerOptions,
  type ProviderOption,
} from "@/features/workspace/ai-containers/provider-options"
import { aiConnectors } from "@/features/workspace/workspace-data"

export function AiContainersPage() {
  const [configDialogOpen, setConfigDialogOpen] = React.useState(false)
  const [setupOption, setSetupOption] = React.useState<ProviderOption | null>(
    null
  )
  const [activeProvider, setActiveProvider] =
    React.useState<ProviderOption | null>(providerOptions[0])
  const [testingProviderId, setTestingProviderId] = React.useState<
    string | null
  >(null)

  const handleConfig = (option: ProviderOption) => {
    setSetupOption(option)
    setConfigDialogOpen(true)
  }

  const handleTest = (option: ProviderOption) => {
    setTestingProviderId(option.id)
    setActiveProvider(option) // Cambia el panel derecho de inmediato
    
    // Simula una latencia de red para ver el skeleton
    setTimeout(() => {
      setTestingProviderId(null)
    }, 1500)
  }

  const handleAddProvider = () => {
    handleConfig(providerOptions[0])
  }

  const handleConnectApi = () => {
    const customApiOption = providerOptions.find((o) => o.id === "custom-api")
    handleConfig(customApiOption ?? providerOptions[0])
  }

  const setupConnector = setupOption
    ? aiConnectors.find((c) => c.id === setupOption.id)
    : undefined

  const activeConnector = activeProvider
    ? aiConnectors.find((c) => c.id === activeProvider.id)
    : undefined

  const isTestingActiveProvider = testingProviderId === activeProvider?.id

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-5">
        <AiContainersHeader
          connectors={aiConnectors}
          onAddProvider={handleAddProvider}
          onConnectApi={handleConnectApi}
        />

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <ConfiguredProvidersList
            options={providerOptions}
            connectors={aiConnectors}
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
      />
    </section>
  )
}
