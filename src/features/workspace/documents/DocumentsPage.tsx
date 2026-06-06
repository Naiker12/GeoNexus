import * as React from "react"
import {
  CloudIcon,
  DatabaseIcon,
  FileSearchIcon,
  FileTextIcon,
  FolderSyncIcon,
  HardDriveIcon,
  KeyRoundIcon,
  RefreshCwIcon,
  UploadCloudIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  documentSources,
  documents,
  type WorkspaceDocument,
} from "@/features/workspace/documents/documents-data"
import { cn } from "@/lib/utils"

export function DocumentsPage() {
  const [oneDriveOpen, setOneDriveOpen] = React.useState(false)

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto grid w-full max-w-[110rem] gap-3">
        <DocumentHeader onConnectOneDrive={() => setOneDriveOpen(true)} />
        <SourceStrip onConnectOneDrive={() => setOneDriveOpen(true)} />

        <DocumentTable />
      </div>

      <OneDriveDialog open={oneDriveOpen} onOpenChange={setOneDriveOpen} />
    </section>
  )
}

function DocumentHeader({
  onConnectOneDrive,
}: {
  onConnectOneDrive: () => void
}) {
  return (
    <header className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileTextIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">
              Documentos y fuentes de conocimiento
            </h1>
            <p className="mt-0.5 max-w-4xl text-sm leading-5 text-muted-foreground">
              Conecta OneDrive, carpetas de Windows o cargas manuales para que
              GeoNexus extraiga texto, cree chunks versionados y entregue
              respuestas con citas por archivo, pagina y seccion.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button size="sm" asChild>
            <label>
              <UploadCloudIcon className="size-4" />
              Subir documento
              <input
                className="sr-only"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.zip,.dxf,.geojson"
                multiple
              />
            </label>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <label>
              <HardDriveIcon className="size-4" />
              Elegir carpeta
              <input className="sr-only" type="file" multiple />
            </label>
          </Button>
          <Button variant="outline" size="sm" onClick={onConnectOneDrive}>
            <CloudIcon className="size-4" />
            Conectar OneDrive
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Metric label="Archivos" value="4" />
        <Metric label="Chunks IA" value="187" />
        <Metric label="Fuentes activas" value="3" />
      </div>
    </header>
  )
}

function SourceStrip({
  onConnectOneDrive,
}: {
  onConnectOneDrive: () => void
}) {
  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Fuentes conectables</h2>
          <p className="text-xs text-muted-foreground">
            Cada fuente alimenta el mismo pipeline de extraccion, memoria y chat.
          </p>
        </div>
        <Button variant="ghost" size="icon-xs" aria-label="Actualizar fuentes">
          <RefreshCwIcon className="size-3.5" />
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {documentSources.map((source) => {
          const isOneDrive = source.name === "OneDrive"
          const actionLabel =
            source.name === "OneDrive"
              ? "Conectar"
              : source.name === "Carpeta Windows"
                ? "Elegir"
                : source.name === "Subir archivos"
                  ? "Subir"
                  : "Agregar URL"

          return (
            <div
              key={source.name}
              className="flex min-h-24 w-full items-start gap-3 rounded-md border border-border bg-background/75 p-3 text-left"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <source.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {source.name}
                </span>
                <span className="mt-1 block line-clamp-2 text-xs leading-4 text-muted-foreground">
                  {source.detail}
                </span>
                <span className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[0.68rem] text-muted-foreground">
                    {source.status}
                  </span>
                  <Button
                    variant={isOneDrive ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={isOneDrive ? onConnectOneDrive : undefined}
                  >
                    {actionLabel}
                  </Button>
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DocumentTable() {
  return (
    <section className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-1.5 border-b border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Biblioteca documental</h2>
          <p className="text-xs leading-4 text-muted-foreground">
            Archivos listos para extraccion, chunks y consulta semantica.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-7">
          <FileSearchIcon className="size-4" />
          Analizar seleccion
        </Button>
      </div>

      <div className="divide-y divide-border">
        {documents.map((document) => (
          <DocumentRow key={document.name} document={document} />
        ))}
      </div>
    </section>
  )
}

function DocumentRow({ document }: { document: WorkspaceDocument }) {
  return (
    <article className="grid gap-2 px-3 py-2 md:grid-cols-[minmax(0,1fr)_7rem_7rem_6rem] md:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <FileTextIcon className="size-4 shrink-0 text-primary" />
          <h3 className="truncate text-sm font-medium">{document.name}</h3>
        </div>
        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
          {document.source} / {document.updated}
        </p>
      </div>
      <Pill>{document.type}</Pill>
      <Status status={document.status} />
      <div className="text-xs text-muted-foreground md:text-right">
        <span className="font-medium text-foreground">{document.chunks}</span>{" "}
        chunks
      </div>
    </article>
  )
}

function OneDriveDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,44rem)] rounded-lg p-0">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CloudIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">Conectar OneDrive</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5">
                Registra una cuenta Microsoft, limita la carpeta raiz y define
                como entran los documentos a la memoria de GeoNexus.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form className="grid gap-4 p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <ConnectionStep
              icon={KeyRoundIcon}
              title="Cuenta"
              text="OAuth y tokens en keychain local."
            />
            <ConnectionStep
              icon={FolderSyncIcon}
              title="Sincronizacion"
              text="Carpeta raiz y frecuencia controlada."
            />
            <ConnectionStep
              icon={DatabaseIcon}
              title="Memoria"
              text="Metadatos, hashes, chunks y citas."
            />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <FormField label="Cuenta Microsoft" placeholder="usuario@empresa.com" />
            <FormField label="Carpeta raiz" placeholder="/GeoNexus/POT" />
            <FormField label="Tipos permitidos" placeholder="PDF, DOCX, ZIP, DXF" />
            <label className="grid gap-1.5 text-sm font-medium">
              Frecuencia
              <select className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition focus:border-primary/50 focus:ring-3 focus:ring-ring/30">
                <option>Cada 15 minutos</option>
                <option>Cada hora</option>
                <option>Manual</option>
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-border bg-muted/45 px-3 py-2.5 text-sm leading-5 text-muted-foreground">
            La conexion conserva los archivos en OneDrive. GeoNexus solo guarda
            rutas, metadatos, hashes, estado de indexacion y referencias para
            citar el origen en el chat.
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-between">
            <Button variant="outline" size="sm" type="button">
              <FileSearchIcon className="size-4" />
              Probar acceso
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button size="sm" type="submit">
                <CloudIcon className="size-4" />
                Guardar fuente
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConnectionStep({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon
  title: string
  text: string
}) {
  return (
    <div className="rounded-md border border-border bg-background/75 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-sm font-medium leading-4">
        <Icon className="size-3.5 text-primary" />
        <span className="truncate">{title}</span>
      </div>
      <p className="mt-0.5 truncate text-xs leading-4 text-muted-foreground">
        {text}
      </p>
    </div>
  )
}

function FormField({
  label,
  placeholder,
}: {
  label: string
  placeholder: string
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition focus:border-primary/50 focus:ring-3 focus:ring-ring/30"
        placeholder={placeholder}
      />
    </label>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/75 px-3 py-1.5">
      <p className="text-[0.7rem] leading-4 text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold leading-4">{value}</p>
    </div>
  )
}

function Pill({ children }: { children: string }) {
  return (
    <span className="inline-flex h-5 w-fit items-center rounded-md border border-border bg-background px-2 text-[0.7rem] text-muted-foreground">
      {children}
    </span>
  )
}

function Status({ status }: { status: WorkspaceDocument["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center rounded-md px-2 text-[0.7rem] font-medium",
        status === "Analizado" && "bg-emerald-500/10 text-emerald-700",
        status === "Indexando" && "bg-sky-500/10 text-sky-700",
        status === "Listo" && "bg-primary/10 text-primary",
        status === "Pendiente" && "bg-muted text-muted-foreground"
      )}
    >
      {status}
    </span>
  )
}
