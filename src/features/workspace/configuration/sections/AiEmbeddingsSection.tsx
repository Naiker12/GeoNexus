import * as React from "react"
import { NativeSelect } from "@/components/ui/native-select"
import { AiModelsTable } from "@/features/workspace/configuration/AiModelsTable"
import { ProviderCatalogDialog } from "@/features/workspace/ai-containers/ProviderCatalogDialog"
import { ProviderSetupDialog } from "@/features/workspace/ai-containers/ProviderSetupDialog"
import { providerOptions, type ProviderOption } from "@/features/workspace/ai-containers/provider-options"
import type { AiConnector } from "@/features/workspace/workspace-data"
import { useConnectors } from "@/contexts/ConnectorsContext"
import { pingLlmProvider } from "@/api/llm"
import { Field } from "@/features/workspace/configuration/settings-ui"

const EMBEDDING_MODELS = [
  { value: "nomic-embed-text", label: "nomic-embed-text (Ollama)", provider: "ollama" },
  { value: "mxbai-embed-large", label: "mxbai-embed-large (Ollama)", provider: "ollama" },
  { value: "all-minilm", label: "all-minilm (Ollama)", provider: "ollama" },
  { value: "text-embedding-3-small", label: "text-embedding-3-small (OpenAI)", provider: "openai" },
  { value: "text-embedding-3-large", label: "text-embedding-3-large (OpenAI)", provider: "openai" },
  { value: "custom", label: "Endpoint personalizado...", provider: "custom" },
]

export function AiEmbeddingsSection() {
  const {
    connectors: configuredConnectors,
    setConnectors: setConfiguredConnectors,
    activeConnectorId,
    setActiveConnectorId,
  } = useConnectors()
  const [catalogOpen, setCatalogOpen] = React.useState(false)
  const [configDialogOpen, setConfigDialogOpen] = React.useState(false)
  const [setupOption, setSetupOption] = React.useState<ProviderOption | null>(null)
  const [embeddingsModel, setEmbeddingsModel] = React.useState<string>("")

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("geonexus.embeddingsModel")
      if (saved) setEmbeddingsModel(saved)
    } catch {}
  }, [])

  const handleSaveEmbeddings = (value: string) => {
    setEmbeddingsModel(value)
    try {
      localStorage.setItem("geonexus.embeddingsModel", value)
    } catch {}
  }

  const handleCatalogSelect = (option: ProviderOption) => {
    setCatalogOpen(false)
    setSetupOption(option)
    setConfigDialogOpen(true)
  }

  const handleSaveProvider = (payload: {
    providerName: string
    model: string
    endpoint: string
    apiKey?: string
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
      apiKey: payload.apiKey,
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
  }

  const handleDeleteProvider = (name: string) => {
    const option = providerOptions.find((p) => p.name === name)
    if (!option) return
    setConfiguredConnectors((current) =>
      current.filter((item) => item.id !== option.id)
    )
    if (activeConnectorId === option.id) {
      setActiveConnectorId(null)
    }
  }

  const handleToggleStatus = (name: string) => {
    const option = providerOptions.find((p) => p.name === name)
    if (!option) return
    setConfiguredConnectors((current) =>
      current.map((item) =>
        item.id === option.id
          ? { ...item, status: item.status === "online" ? "offline" : "online" }
          : item
      )
    )
  }

  const modelsForTable = configuredConnectors.map((c) => ({
    provider: c.name,
    model: c.model,
    endpoint: c.endpoint,
    key: c.apiKey ? "••••••••" : "Sin clave",
    status: c.status === "online" ? "Activo" : "Inactivo",
  }))

  const setupConnector = setupOption
    ? configuredConnectors.find((c) => c.id === setupOption.id)
    : undefined

  return (
    <>
      <div className="grid gap-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
            Modelos IA configurados
          </h3>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Proveedores activos, endpoints y claves. Rust valida antes de
            enrutar.
          </p>
        </div>

        <AiModelsTable
          models={modelsForTable}
          onAddClick={() => setCatalogOpen(true)}
          onDelete={handleDeleteProvider}
          onToggleStatus={handleToggleStatus}
        />

        <div className="rounded-lg border border-border bg-background/75 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
            Embeddings
          </h3>
          <p className="mt-1 mb-3 text-xs leading-4 text-muted-foreground">
            Modelo activo para ChromaDB y búsqueda semántica.
          </p>
          <Field label="Modelo de embeddings">
            <NativeSelect
              value={embeddingsModel}
              onChange={(e) => handleSaveEmbeddings(e.target.value)}
            >
              <option value="">Sin modelo de embeddings configurado</option>
              {EMBEDDING_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </div>

      <ProviderCatalogDialog
        open={catalogOpen}
        options={providerOptions}
        onOpenChange={setCatalogOpen}
        onSelect={handleCatalogSelect}
      />

      <ProviderSetupDialog
        connector={setupConnector}
        open={configDialogOpen}
        option={setupOption}
        onOpenChange={setConfigDialogOpen}
        onSave={handleSaveProvider}
      />
    </>
  )
}
