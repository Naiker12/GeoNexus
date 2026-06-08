import { NativeSelect } from "@/components/ui/native-select"
import {
  CompactCheckRow,
  Field,
  SideMetric,
} from "@/features/workspace/configuration/settings-ui"

export function MemorySection() {
  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
          Memoria y vectores
        </h3>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          ChromaDB local, colecciones, chunk size y búsqueda semántica.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Chunk POT">
          <NativeSelect className="w-full">
            <option>512 tokens</option>
            <option>768 tokens</option>
            <option>1024 tokens</option>
          </NativeSelect>
        </Field>

        <Field label="Modelo de embeddings">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Sin modelo configurado
          </div>
        </Field>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <SideMetric label="Coleccion documental" value="Sin coleccion" />
        <SideMetric label="Coleccion GIS" value="Sin coleccion" />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <CompactCheckRow label="Citar pagina y seccion" checked />
        <CompactCheckRow label="Cache semantico" />
        <CompactCheckRow label="Re-indexar al guardar" checked />
        <CompactCheckRow label="Embedding incremental" checked />
      </div>
    </div>
  )
}
