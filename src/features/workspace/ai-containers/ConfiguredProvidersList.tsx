import { ProviderCardItem } from "@/features/workspace/ai-containers/ProviderCardItem"
import type { ProviderOption } from "@/features/workspace/ai-containers/provider-options"
import type { AiConnector } from "@/types/workspace-types"

type ConfiguredProvidersListProps = {
  options: ProviderOption[]
  connectors: AiConnector[]
  testingProviderId: string | null
  onConfig: (option: ProviderOption) => void
  onTest: (option: ProviderOption) => void
  onDelete: (option: ProviderOption) => void
}

export function ConfiguredProvidersList({
  options,
  connectors,
  testingProviderId,
  onConfig,
  onTest,
  onDelete,
}: ConfiguredProvidersListProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Proveedores configurados
      </h2>
      <div className="flex flex-col gap-3">
        {connectors.length ? (
          connectors.map((connector) => {
            const option =
              options.find((candidate) => candidate.id === connector.id) ??
              options[0]
            if (!option) return null

            return (
              <ProviderCardItem
                key={connector.id}
                option={option}
                connector={connector}
                isTesting={testingProviderId === option.id}
                onConfig={onConfig}
                onTest={onTest}
                onDelete={onDelete}
              />
            )
          })
        ) : (
          <div className="rounded-lg border border-border/80 bg-card/95 px-3 py-10 text-center text-sm text-muted-foreground shadow-sm backdrop-blur">
            Sin proveedores configurados
          </div>
        )}
      </div>
    </div>
  )
}
