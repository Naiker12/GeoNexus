import * as React from "react"
import {
  DatabaseIcon,
  FileTextIcon,
  GlobeIcon,
  PlusIcon,
  UploadCloudIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/Textarea"

const sourceOptions = [
  {
    id: "write",
    title: "Escribir contexto",
    description: "Notas, alcance, objetivo o instrucciones iniciales.",
    icon: FileTextIcon,
  },
  {
    id: "upload",
    title: "Subir archivo",
    description: "PDF, DOCX, DXF, SHP comprimido o anexos tecnicos.",
    icon: UploadCloudIcon,
  },
  {
    id: "web",
    title: "Fuente web",
    description: "URL publica, SharePoint o enlace de referencia.",
    icon: GlobeIcon,
  },
  {
    id: "default",
    title: "Plantilla del sistema",
    description: "Usa la estructura GeoNexus por defecto.",
    icon: DatabaseIcon,
  },
] as const

type SourceMode = (typeof sourceOptions)[number]["id"]

export function CreateProjectDialog() {
  const [sourceMode, setSourceMode] = React.useState<SourceMode>("write")

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex h-8 w-full items-center gap-2 rounded-md border border-sidebar-border bg-transparent px-2 text-sm font-medium text-sidebar-foreground transition-colors hover:border-sidebar-primary/40 hover:bg-transparent">
          <PlusIcon className="size-4" />
          Crear proyecto
        </button>
      </DialogTrigger>

      <DialogContent className="w-[min(94vw,48rem)] rounded-lg p-0">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PlusIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">
                Crear proyecto GeoNexus
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5">
                Define el proyecto y carga la informacion inicial que la IA
                usara como contexto trazable.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form className="grid gap-3 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre del proyecto">
                  <Input placeholder="Nombre del proyecto" />
                </Field>
                <Field label="Municipio / area">
                  <Input placeholder="Municipio o area de trabajo" />
                </Field>
                <Field label="Tipo de proyecto">
                  <NativeSelect className="w-full">
                    <option>Planeacion territorial</option>
                    <option>Analisis predial</option>
                    <option>Riesgo y restricciones</option>
                    <option>Infraestructura urbana</option>
                  </NativeSelect>
                </Field>
                <Field label="Periodo">
                  <Input placeholder="Periodo del proyecto" />
                </Field>
              </div>

              <div className="rounded-lg border border-border bg-background/75 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Contexto inicial</h3>
                    <p className="text-xs leading-4 text-muted-foreground">
                      Carga informacion propia o usa la base por defecto del sistema.
                    </p>
                  </div>
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.68rem] font-medium text-primary">
                    opcional
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {sourceOptions.map((option) => (
                    <button
                      key={option.title}
                      type="button"
                      onClick={() => setSourceMode(option.id)}
                      className="grid gap-1 rounded-md border border-border bg-card/70 p-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5 data-[active=true]:border-primary/60 data-[active=true]:bg-primary/10"
                      data-active={sourceMode === option.id}
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <option.icon className="size-3.5 text-primary" />
                        {option.title}
                      </span>
                      <span className="text-xs leading-4 text-muted-foreground">
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <SourceModePanel mode={sourceMode} />
            </div>

            <aside className="grid content-start gap-3">
              <div className="grid gap-2 rounded-lg border border-border bg-background/75 p-3">
                <div className="flex items-center gap-2">
                  <DatabaseIcon className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">Memoria</h3>
                </div>
                <Field label="Coleccion">
                  <Input placeholder="Nombre de coleccion" />
                </Field>
                <Field label="Privacidad">
                  <NativeSelect className="w-full">
                    <option>Local en este equipo</option>
                    <option>Keychain + SQLite</option>
                    <option>Solo proyecto temporal</option>
                  </NativeSelect>
                </Field>
              </div>

              <div className="grid gap-2 rounded-lg border border-border bg-background/75 p-3">
                <div className="flex items-center gap-2">
                  <FileTextIcon className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">Entrada activa</h3>
                </div>
                <SourceModeSummary mode={sourceMode} />
              </div>
            </aside>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline" size="sm" type="button">
                Cancelar
              </Button>
            </DialogClose>
            <Button size="sm" type="submit">
              Crear proyecto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SourceModePanel({ mode }: { mode: SourceMode }) {
  if (mode === "upload") {
    return (
      <div className="grid gap-3 rounded-lg border border-dashed border-border bg-background/75 p-3">
        <div>
          <h3 className="text-sm font-semibold">Subir archivo inicial</h3>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            Se enviara al pipeline de extraccion, chunks, memoria y grafo.
          </p>
        </div>
        <Input
          type="file"
          accept=".pdf,.doc,.docx,.dxf,.zip,.geojson,.json"
          className="pt-1.5"
        />
        <CheckRow label="Extraer texto y citas por pagina" checked />
        <CheckRow label="Crear nodos iniciales en el grafo" checked />
      </div>
    )
  }

  if (mode === "web") {
    return (
      <div className="grid gap-3 rounded-lg border border-border bg-background/75 p-3">
        <div>
          <h3 className="text-sm font-semibold">Fuente externa</h3>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            Registra una fuente de internet o intranet para consultar y citar.
          </p>
        </div>
        <Field label="URL">
          <Input placeholder="https://..." />
        </Field>
        <Field label="Tipo de fuente">
          <NativeSelect className="w-full">
            <option>Documento tecnico</option>
            <option>SharePoint / OneDrive</option>
            <option>Normativa publica</option>
            <option>Servicio GIS</option>
          </NativeSelect>
        </Field>
      </div>
    )
  }

  if (mode === "default") {
    return (
      <div className="grid gap-3 rounded-lg border border-border bg-background/75 p-3">
        <div>
          <h3 className="text-sm font-semibold">Plantilla del sistema</h3>
          <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
            GeoNexus creara estructura base para documentos, capas, memoria,
            analisis y trazabilidad.
          </p>
        </div>
        <Field label="Plantilla">
          <NativeSelect className="w-full">
            <option>POT / planeacion territorial</option>
            <option>Analisis predial</option>
            <option>Riesgo y restricciones</option>
            <option>Proyecto GIS vacio</option>
          </NativeSelect>
        </Field>
        <CheckRow label="Crear colecciones de memoria por defecto" checked />
        <CheckRow label="Crear carpetas del proyecto" checked />
      </div>
    )
  }

  return (
    <Field label="Informacion o instrucciones">
      <Textarea
        rows={5}
        placeholder="Escribe aqui el alcance, fuentes conocidas, restricciones, preguntas frecuentes o criterios que debe recordar la IA."
      />
    </Field>
  )
}

function SourceModeSummary({ mode }: { mode: SourceMode }) {
  const activeOption = sourceOptions.find((option) => option.id === mode)

  return (
    <div className="grid gap-2">
      <div className="rounded-md border border-border bg-card/70 p-2">
        <p className="text-sm font-medium">{activeOption?.title}</p>
        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
          {activeOption?.description}
        </p>
      </div>
      <CheckRow label="Guardar como fuente trazable" checked />
      <CheckRow label="Disponible para chat IA" checked />
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}

function CheckRow({ label, checked = false }: { label: string; checked?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-card/70 px-2.5 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="checkbox"
        defaultChecked={checked}
        className="size-4 accent-[var(--primary)]"
      />
    </label>
  )
}
