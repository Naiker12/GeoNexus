import * as React from "react"

import { AiModelsTable } from "@/features/workspace/configuration/AiModelsTable"
import { NativeSelect } from "@/components/ui/native-select"
import { SettingsDialogs } from "@/features/workspace/configuration/SettingsDialogs"
import type { SettingsDialog } from "@/features/workspace/configuration/settings-types"
import { Field } from "@/features/workspace/configuration/settings-ui"

export function AiEmbeddingsSection() {
  const [dialog, setDialog] = React.useState<SettingsDialog>(null)

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

        <AiModelsTable onDialogChange={setDialog} />

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

      <SettingsDialogs dialog={dialog} onOpenChange={setDialog} />
    </>
  )
}
