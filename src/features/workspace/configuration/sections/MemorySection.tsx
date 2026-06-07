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
          <NativeSelect className="w-full">
            <option>nomic-embed-text</option>
            <option>all-minilm-l6-v2</option>
            <option>bge-small-en</option>
          </NativeSelect>
        </Field>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <SideMetric label="Coleccion POT" value="pot_normas" />
        <SideMetric label="Coleccion GIS" value="gis_knowledge" />
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
