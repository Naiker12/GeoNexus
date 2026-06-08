import * as React from "react"

import { AiModelsTable } from "@/features/workspace/configuration/AiModelsTable"
import { SettingsDialogs } from "@/features/workspace/configuration/SettingsDialogs"
import type { SettingsDialog } from "@/features/workspace/configuration/settings-types"
import { Field } from "@/features/workspace/configuration/settings-ui"

const initialModels: {
  provider: string
  model: string
  endpoint: string
  key: string
  status: string
}[] = []

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
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Sin modelo de embeddings configurado
            </div>
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
