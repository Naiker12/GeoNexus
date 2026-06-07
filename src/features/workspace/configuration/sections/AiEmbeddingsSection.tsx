import * as React from "react"

import { AiModelsTable } from "@/features/workspace/configuration/AiModelsTable"
import { NativeSelect } from "@/components/ui/native-select"
import { SettingsDialogs } from "@/features/workspace/configuration/SettingsDialogs"
import type { SettingsDialog } from "@/features/workspace/configuration/settings-types"
import { Field } from "@/features/workspace/configuration/settings-ui"

const initialModels = [
  {
    provider: "Ollama",
    model: "llama3.1",
    endpoint: "localhost:11434",
    key: "Sin clave",
    status: "Activo",
  },
  {
    provider: "LM Studio",
    model: "OpenAI compatible",
    endpoint: "localhost:1234/v1",
    key: "Sin clave",
    status: "Inactivo",
  },
  {
    provider: "OpenRouter",
    model: "claude / gpt / gemini",
    endpoint: "openrouter.ai/api/v1",
    key: "keychain: openrouter",
    status: "Revisar",
  },
]

export function AiEmbeddingsSection() {
  const [dialog, setDialog] = React.useState<SettingsDialog>(null)
  const [models, setModels] = React.useState(initialModels)

  const handleAdd = (newModel: any) => {
    setModels((prev) => [...prev, newModel])
  }

  const handleEdit = (oldName: string, updatedModel: any) => {
    setModels((prev) =>
      prev.map((m) => (m.provider === oldName ? updatedModel : m))
    )
  }

  const handleDelete = (name: string) => {
    setModels((prev) => prev.filter((m) => m.provider !== name))
  }

  const handleToggleStatus = (name: string) => {
    setModels((prev) =>
      prev.map((m) =>
        m.provider === name
          ? { ...m, status: m.status === "Activo" ? "Inactivo" : "Activo" }
          : m
      )
    )
  }

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

        <AiModelsTable models={models} onDialogChange={setDialog} />

        <div className="rounded-lg border border-border bg-background/75 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
            Embeddings
          </h3>
          <p className="mt-1 mb-3 text-xs leading-4 text-muted-foreground">
            Modelo activo para ChromaDB y búsqueda semántica.
          </p>
          <Field label="Modelo de embeddings">
            <NativeSelect className="w-full">
              <option>nomic-embed-text (activo)</option>
              <option>all-minilm-l6-v2</option>
              <option>bge-small-en</option>
            </NativeSelect>
          </Field>
        </div>
      </div>

      <SettingsDialogs
        dialog={dialog}
        onOpenChange={setDialog}
        models={models}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
      />
    </>
  )
}
