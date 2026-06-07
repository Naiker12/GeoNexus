import { Button } from "@/components/ui/Button"
import { NativeSelect } from "@/components/ui/native-select"
import type { SettingsDialog } from "@/features/workspace/settings/settings-types"
import { Field } from "@/features/workspace/settings/settings-ui"

const mapEngines = [
  {
    engine: "MapLibre GL",
    use: "Tiles vectoriales, estilos propios y alto rendimiento WebGL.",
    status: "Activo",
  },
  {
    engine: "ArcGIS JS",
    use: "Servicios Esri, analisis GIS avanzado y escenas 3D.",
    status: "Disponible",
  },
  {
    engine: "Leaflet",
    use: "Overlays simples, mapas ligeros y mobile-friendly.",
    status: "Disponible",
  },
  {
    engine: "Deck.gl",
    use: "Nubes de puntos, flujos, hexagon layers y big data 3D.",
    status: "GPU",
  },
]

export function MapSettingsPanel({
  onDialogChange,
}: {
  onDialogChange: (dialog: SettingsDialog) => void
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 lg:grid-cols-3">
        <Field label="Motor predeterminado">
          <NativeSelect className="w-full">
            <option>MapLibre GL</option>
            <option>ArcGIS JS</option>
            <option>Leaflet</option>
            <option>Deck.gl</option>
          </NativeSelect>
        </Field>
        <Field label="Formato interno de capas">
          <NativeSelect className="w-full">
            <option>GeoJSON normalizado</option>
            <option>FeatureLayer ArcGIS</option>
            <option>Vector tiles MVT</option>
          </NativeSelect>
        </Field>
        <Field label="Exportacion de mapa">
          <NativeSelect className="w-full">
            <option>PNG alta resolucion</option>
            <option>PDF tecnico</option>
            <option>GeoJSON + estilos</option>
          </NativeSelect>
        </Field>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card/70">
        <div className="border-b border-border px-3 py-2">
          <h4 className="text-sm font-semibold">Motores de mapa</h4>
          <p className="text-xs text-muted-foreground">
            Seleccion segun tipo de analisis, volumen de datos y dependencia GIS.
          </p>
        </div>
        <div className="divide-y divide-border">
          {mapEngines.map((engine) => (
            <article
              key={engine.engine}
              className="grid gap-2 px-3 py-2 md:grid-cols-[9rem_minmax(0,1fr)_7rem_auto] md:items-center"
            >
              <p className="truncate text-sm font-medium">{engine.engine}</p>
              <p className="text-xs leading-4 text-muted-foreground">
                {engine.use}
              </p>
              <span className="w-fit rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.68rem] font-medium text-primary">
                {engine.status}
              </span>
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="h-7"
                onClick={() =>
                  onDialogChange({
                    type: "configure-map",
                    name: engine.engine,
                  })
                }
              >
                Configurar
              </Button>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
