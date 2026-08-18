import { getSetting, setSetting } from "@/api/settings"
import { NativeSelect } from "@/components/ui/native-select"
import { useConnectors } from "@/contexts/ConnectorsContext"
import { ProviderMasterDialog } from "@/features/workspace/ai-containers/ProviderMasterDialog"
import { providerOptions } from "@/features/workspace/ai-containers/provider-options"
import { AiModelsTable } from "@/features/workspace/configuration/AiModelsTable"
import { Field } from "@/features/workspace/configuration/settings-ui"
import { cn } from "@/lib/utils"
import type { AiConnector } from "@/types/workspace-types"
import { LayersIcon } from "lucide-react"
import * as React from "react"

const EMBEDDING_MODELS = [
  { value: "nomic-embed-text", label: "nomic-embed-text (Ollama, 768d)", provider: "ollama" },
  { value: "bge-m3", label: "BAAI/bge-m3 (Local/HF, 1024d)", provider: "huggingface" },
  { value: "mxbai-embed-large", label: "mxbai-embed-large (Ollama, 1024d)", provider: "ollama" },
  {
    value: "text-embedding-3-small",
    label: "text-embedding-3-small (OpenAI, 1536d)",
    provider: "openai",
  },
  {
    value: "text-embedding-3-large",
    label: "text-embedding-3-large (OpenAI, 3072d)",
    provider: "openai",
  },
  { value: "custom", label: "Endpoint personalizado...", provider: "custom" },
]

const EMBEDDINGS_SETTING_KEY = "embeddings_model"

export function AiEmbeddingsSection() {
  const {
    connectors: configuredConnectors,
    setConnectors: setConfiguredConnectors,
    activeConnectorId,
    setActiveConnectorId,
  } = useConnectors()
  const [masterDialogOpen, setMasterDialogOpen] = React.useState(false)
  const [selectedProviderId, setSelectedProviderId] = React.useState<string>("ollama")
  const [embeddingsModel, setEmbeddingsModel] = React.useState<string>("nomic-embed-text")

  React.useEffect(() => {
    getSetting(EMBEDDINGS_SETTING_KEY).then((saved) => {
      if (saved) setEmbeddingsModel(saved)
    })
  }, [])

  const handleSaveEmbeddings = (value: string) => {
    setEmbeddingsModel(value)
    setSetting(EMBEDDINGS_SETTING_KEY, value)
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

  const handleDeleteProvider = (name: string) => {
    const option = providerOptions.find((p) => p.name === name)
    if (!option) return
    setConfiguredConnectors((current) => current.filter((item) => item.id !== option.id))
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
    id: c.id,
    provider: c.name,
    model: c.model,
    endpoint: c.endpoint,
    key: c.apiKey ? "••••••••" : "Sin clave",
    status: c.status === "online" ? "Activo" : "Inactivo",
  }))

  const embeddingModelsFromConnectors = configuredConnectors
    .filter(
      (c) =>
        c.status === "online" &&
        (c.model?.toLowerCase().includes("embed") || c.supportsTools === false)
    )
    .map((c) => ({
      value: c.model ?? c.name,
      label: `${c.model ?? c.name} (${c.name})`,
      provider: c.provider,
    }))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground font-mono">
          GeoNexus — Proveedores y Modelos IA
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Configura servidores de inferencia, endpoints locales y comerciales con enrutamiento
          inteligente.
        </p>
      </div>

      {/* ─── Tabla de Modelos Conectados ─── */}
      <AiModelsTable
        models={modelsForTable}
        onAddClick={() => {
          setSelectedProviderId("ollama")
          setMasterDialogOpen(true)
        }}
        onDelete={handleDeleteProvider}
        onToggleStatus={handleToggleStatus}
      />

      {/* ─── Embeddings y Vectorización Semántica ─── */}
      <div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-muted/80 text-foreground border border-border/60">
            <LayersIcon className="size-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
              Embeddings y Búsqueda Semántica
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modelo activo para vectorización de capas GIS, documentos y memoria RAG.
            </p>
          </div>
        </div>

        {/* Chips de Modelos Recomendados */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground block">
            Modelos de Embeddings Recomendados
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: "nomic-embed-text",
                name: "nomic-embed-text",
                desc: "Local / Ollama (768 dim)",
                badge: "Offline",
              },
              {
                id: "bge-m3",
                name: "BAAI/bge-m3",
                desc: "Multilingual 8k (1024 dim)",
                badge: "Precisión",
              },
              {
                id: "text-embedding-3-small",
                name: "text-embedding-3",
                desc: "OpenAI Cloud (1536 dim)",
                badge: "Cloud",
              },
            ].map((preset) => {
              const isSelected = embeddingsModel === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSaveEmbeddings(preset.id)}
                  className={cn(
                    "flex flex-col text-left rounded-2xl border p-3 transition-all cursor-pointer",
                    isSelected
                      ? "border-primary bg-primary/10 text-foreground shadow-2xs font-semibold"
                      : "border-border/70 bg-card/60 hover:bg-muted/40 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-xs font-bold text-foreground truncate">
                      {preset.name}
                    </span>
                    <span className="rounded-md bg-muted px-1.5 py-0.2 text-[9px] font-mono font-medium text-muted-foreground">
                      {preset.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{preset.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Dropdown Completo */}
        <Field label="O seleccionar manualmente otro modelo">
          <NativeSelect
            value={embeddingsModel}
            onChange={(e) => handleSaveEmbeddings(e.target.value)}
            className="rounded-xl font-mono text-xs"
          >
            <option value="">— Selecciona un modelo de embeddings —</option>
            {EMBEDDING_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
            {embeddingModelsFromConnectors.length > 0 && (
              <optgroup label="Desde conectores activos">
                {embeddingModelsFromConnectors.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            )}
          </NativeSelect>
        </Field>
      </div>

      {/* Diálogo Maestro Unificado Master-Detail */}
      <ProviderMasterDialog
        open={masterDialogOpen}
        onOpenChange={setMasterDialogOpen}
        initialSelectedId={selectedProviderId}
        configuredConnectors={configuredConnectors}
        onSaveConnector={handleSaveConnector}
      />
    </div>
  )
}
