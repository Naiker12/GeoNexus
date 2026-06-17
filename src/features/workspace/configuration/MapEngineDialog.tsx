import { CpuIcon, Layers3Icon, MapIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"
import { NativeSelect } from "@/components/ui/native-select"
import { DialogActions } from "@/features/workspace/configuration/DialogActions"
import {
  CheckRow,
  Field,
  SideMetric,
} from "@/features/workspace/configuration/settings-ui"

const engineDefaults: Record<
  string,
  {
    renderer: string
    maxFeatures: string
    cache: string
    profile: string
  }
> = {
  "MapLibre GL": {
    renderer: "WebGL vector",
    maxFeatures: "100k features",
    cache: "Tiles + estilos",
    profile: "Mapa principal",
  },
  "ArcGIS JS": {
    renderer: "Esri LayerView",
    maxFeatures: "Servicios externos",
    cache: "Portal / WMS / WFS",
    profile: "GIS avanzado",
  },
  Leaflet: {
    renderer: "Canvas ligero",
    maxFeatures: "25k features",
    cache: "Overlays locales",
    profile: "Vista mobile",
  },
  "Deck.gl": {
    renderer: "GPU layers",
    maxFeatures: "+100k features",
    cache: "Buffers WebGL",
    profile: "Big data 3D",
  },
}

export function MapEngineDialog({
  open,
  name,
  onOpenChange,
}: {
  open: boolean
  name: string
  onOpenChange: (open: boolean) => void
}) {
  const settings = engineDefaults[name] ?? engineDefaults["MapLibre GL"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,42rem)] rounded-lg p-0">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">
                Configurar {name}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5">
                Ajusta motor, cache, reproyeccion y exportacion sin cambiar el
                resto de la vista.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form 
          className="grid gap-3 p-4" 
          onSubmit={(e) => {
            e.preventDefault()
            // Aquí se llamaría a la lógica de guardado
            onOpenChange(false)
          }}
        >
          <div className="grid gap-2 sm:grid-cols-4">
            <SideMetric label="Perfil" value={settings.profile} />
            <SideMetric label="Renderer" value={settings.renderer} />
            <SideMetric label="Volumen" value={settings.maxFeatures} />
            <SideMetric label="Cache" value={settings.cache} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Estilo base">
              <NativeSelect className="w-full">
                <option>Geo Agents tecnico</option>
                <option>Claro operativo</option>
                <option>Oscuro GIS</option>
              </NativeSelect>
            </Field>
            <Field label="Sistema de coordenadas">
              <NativeSelect className="w-full">
                <option>EPSG:4326 - WGS84</option>
                <option>EPSG:3857 - Web Mercator</option>
                <option>EPSG:3116 - Colombia Bogota</option>
              </NativeSelect>
            </Field>
            <Field label="Cache local">
              <Input placeholder="%APPDATA%\\GeoNexus\\map-cache" />
            </Field>
            <Field label="Exportacion predeterminada">
              <NativeSelect className="w-full">
                <option>PNG alta resolucion</option>
                <option>PDF tecnico</option>
                <option>GeoJSON + estilos</option>
              </NativeSelect>
            </Field>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <CheckRow label="Reproyectar capas al cargar" checked />
            <CheckRow label="Conservar viewport del proyecto" checked />
            <CheckRow label="Usar aceleracion GPU" checked={name !== "Leaflet"} />
            <CheckRow label="Liberar recursos al cambiar motor" checked />
          </div>

          <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/35 p-2">
            <Button variant="outline" size="sm" type="button">
              <CpuIcon className="size-4" />
              Probar rendimiento
            </Button>
            <Button variant="outline" size="sm" type="button">
              <Layers3Icon className="size-4" />
              Validar capas
            </Button>
          </div>

          <DialogActions submitLabel="Guardar motor" onCancel={() => onOpenChange(false)} />
        </form>
      </DialogContent>
    </Dialog>
  )
}
