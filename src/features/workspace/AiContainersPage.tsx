import * as React from "react"
import { KeyRoundIcon } from "lucide-react"

import { GeoNexusIcon } from "@/components/brand/GeoNexusIcon"
import { Button } from "@/components/ui/Button"
import { AiSummaryCards } from "@/features/workspace/ai-containers/AiSummaryCards"
import { ProviderOptionCard } from "@/features/workspace/ai-containers/ProviderOptionCard"
import { ProviderSetupDialog } from "@/features/workspace/ai-containers/ProviderSetupDialog"
import {
  providerOptions,
  type ProviderOption,
} from "@/features/workspace/ai-containers/provider-options"
import { aiConnectors } from "@/features/workspace/workspace-data"

export function AiContainersPage() {
  const [selectedProvider, setSelectedProvider] =
    React.useState<ProviderOption | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const openProviderDialog = (option: ProviderOption) => {
    setSelectedProvider(option)
    setDialogOpen(true)
  }

  const selectedConnector = selectedProvider
    ? aiConnectors.find((connector) => connector.id === selectedProvider.id)
    : undefined

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-3">
        <header className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
          <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
          <div className="p-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-start gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <GeoNexusIcon className="size-4" variant="agent" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                      Conecta modelos, APIs y herramientas IA
                    </h1>
                    <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm">
                      Panel multi-LLM para Ollama, LM Studio, OpenRouter, APIs
                      directas y MCP, siguiendo la arquitectura offline-first de
                      GeoNexus.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => openProviderDialog(providerOptions[0])}
                >
                  <GeoNexusIcon className="size-4" variant="agent" />
                  Agregar modelo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    openProviderDialog(
                      providerOptions.find((option) => option.id === "custom-api") ??
                        providerOptions[0]
                    )
                  }
                >
                  <KeyRoundIcon className="size-4" />
                  Conectar por API
                </Button>
              </div>
            </div>

            <div className="mt-2.5">
              <AiSummaryCards connectors={aiConnectors} />
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {providerOptions.map((option) => (
            <ProviderOptionCard
              key={option.id}
              option={option}
              connector={aiConnectors.find(
                (connector) => connector.id === option.id
              )}
              onSelect={openProviderDialog}
            />
          ))}
        </section>
      </div>

      <ProviderSetupDialog
        connector={selectedConnector}
        open={dialogOpen}
        option={selectedProvider}
        onOpenChange={setDialogOpen}
      />
    </section>
  )
}
