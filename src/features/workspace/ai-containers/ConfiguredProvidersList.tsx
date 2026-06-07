import { ProviderCardItem } from "@/features/workspace/ai-containers/ProviderCardItem"
import type { ProviderOption } from "@/features/workspace/ai-containers/provider-options"
import type { AiConnector } from "@/features/workspace/workspace-data"

type ConfiguredProvidersListProps = {
  options: ProviderOption[]
  connectors: AiConnector[]
  testingProviderId: string | null
  onConfig: (option: ProviderOption) => void
  onTest: (option: ProviderOption) => void
}

export function ConfiguredProvidersList({
  options,
  connectors,
  testingProviderId,
  onConfig,
  onTest,
}: ConfiguredProvidersListProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Proveedores configurados
      </h2>
      <div className="flex flex-col gap-3">
        {options.map((option) => (
          <ProviderCardItem
            key={option.id}
            option={option}
            connector={connectors.find((c) => c.id === option.id)}
            isTesting={testingProviderId === option.id}
            onConfig={onConfig}
            onTest={onTest}
          />
        ))}
      </div>
    </div>
  )
}
