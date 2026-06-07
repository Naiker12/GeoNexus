import {
  BellIcon,
  DatabaseIcon,
  FolderCogIcon,
  MapIcon,
  RefreshCwIcon,
  SaveIcon,
  Settings2Icon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { NativeSelect } from "@/components/ui/native-select"
import { LocalPathDialogContent } from "@/features/workspace/settings/LocalPathDialog"
import {
  localPaths,
  maintenanceTasks,
} from "@/features/workspace/settings/settings-data"
import {
  CompactCheckRow,
  Field,
  SideMetric,
} from "@/features/workspace/settings/settings-ui"

export function LocalPathsPanel() {
  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Rutas locales</h2>
        <p className="text-xs leading-4 text-muted-foreground">
          Ubicaciones que la app usa para datos, memoria y configuracion.
        </p>
      </div>
      <div className="divide-y divide-border">
        {localPaths.map((path) => (
          <article
            key={path.label}
            className="grid gap-2 px-3 py-2 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-center"
          >
            <div>
              <p className="text-sm font-medium">{path.label}</p>
              <p className="text-xs text-muted-foreground">{path.detail}</p>
            </div>
            <code className="truncate rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-muted-foreground">
              {path.value}
            </code>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="h-7"
                >
                  <FolderCogIcon className="size-4" />
                  Cambiar
                </Button>
              </DialogTrigger>
              <LocalPathDialogContent
                name={path.label}
                value={path.value}
                detail={path.detail}
              />
            </Dialog>
          </article>
        ))}
      </div>
    </section>
  )
}

export function RuntimePanel() {
  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <Settings2Icon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Estado actual</h2>
      </div>
      <div className="grid gap-2">
        <SideMetric label="Proyecto" value="POT Barranquilla 2024" />
        <SideMetric label="IA activa" value="Ollama / llama3.1" />
        <SideMetric label="Embeddings" value="nomic-embed-text" />
        <SideMetric label="MCP online" value="2 de 3" />
      </div>
    </section>
  )
}

export function MapRuntimePanel() {
  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapIcon className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Mapa activo</h2>
        </div>
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.68rem] font-medium text-primary">
          MapLibre
        </span>
      </div>
      <div className="grid gap-2">
        <SideMetric label="Capas cargadas" value="12" />
        <SideMetric label="Renderer" value="WebGL" />
        <SideMetric label="Formato neutro" value="GeoJSON" />
        <SideMetric label="Viewport" value="Restaurar al abrir" />
      </div>
      <div className="mt-3 grid gap-1.5">
        <CompactCheckRow label="Conservar capas" checked />
        <CompactCheckRow label="Restaurar viewport" checked />
        <CompactCheckRow label="Reproyectar automatico" checked />
        <CompactCheckRow label="Liberar WebGL al cambiar" checked />
        <CompactCheckRow label="Deck.gl para +100k features" />
        <CompactCheckRow label="Guardar estilos neutros" checked />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm">
          <RefreshCwIcon className="size-4" />
          Probar
        </Button>
        <Button variant="outline" size="sm">
          <SaveIcon className="size-4" />
          Aplicar
        </Button>
      </div>
    </section>
  )
}

export function MemoryRuntimePanel() {
  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <DatabaseIcon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Memoria</h2>
      </div>
      <div className="grid gap-2">
        <Field label="Chunk POT">
          <NativeSelect className="w-full">
            <option>512 tokens</option>
            <option>768 tokens</option>
            <option>1024 tokens</option>
          </NativeSelect>
        </Field>
        <SideMetric label="Coleccion POT" value="pot_normas" />
        <SideMetric label="Coleccion GIS" value="gis_knowledge" />
        <CompactCheckRow label="Citar pagina y seccion" checked />
        <CompactCheckRow label="Cache semantico" />
      </div>
    </section>
  )
}

export function MaintenancePanel() {
  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BellIcon className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Mantenimiento</h2>
        </div>
        <Button variant="outline" size="sm" className="h-7">
          <Trash2Icon className="size-4" />
          Limpiar cache
        </Button>
      </div>
      <div className="grid gap-2">
        {maintenanceTasks.map((task) => (
          <article
            key={task.title}
            className="rounded-md border border-border bg-background/75 p-2.5"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <task.icon className="size-3.5 text-primary" />
              <span className="truncate">{task.title}</span>
            </div>
            <code className="mt-1 block truncate font-mono text-[0.68rem] text-muted-foreground">
              {task.command}
            </code>
          </article>
        ))}
      </div>
    </section>
  )
}
