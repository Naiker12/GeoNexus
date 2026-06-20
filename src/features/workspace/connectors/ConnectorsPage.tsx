import * as React from "react"
import { CloudIcon, FolderSyncIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { AddConnectorDialog } from "@/features/workspace/connectors/AddConnectorDialog"
import { ConnectorCard } from "@/features/workspace/connectors/ConnectorCard"
import { ConnectorSetupDialog } from "@/features/workspace/connectors/ConnectorSetupDialog"
import type { ConnectorProvider, ConnectorProviderId } from "@/features/workspace/connectors/connector-types"
import { listConnectorConfigs } from "@/api/connector"
import type { ConnectorConfig } from "@/types/connector"

/** Mapea el provider de backend (snake_case) al id del frontend (kebab-case) */
const backendProviderToId: Record<string, ConnectorProviderId> = {
  local: "local",
  one_drive: "onedrive",
  share_point: "sharepoint",
  google_drive: "google-drive",
  dropbox: "dropbox",
  s3: "s3",
}

const providerName: Record<ConnectorProviderId, string> = {
  local: "Carpeta local",
  onedrive: "OneDrive",
  sharepoint: "SharePoint",
  "google-drive": "Google Drive",
  dropbox: "Dropbox",
  "arcgis-pro": "ArcGIS Pro",
  "api-rest": "API externa",
  s3: "S3 / MinIO",
}

function configToProvider(config: ConnectorConfig): ConnectorProvider {
  const id = backendProviderToId[config.provider] ?? (config.provider as ConnectorProviderId)
  return {
    id,
    name: config.display_name || providerName[id] || id,
    kind: "Local",
    status: "connected",
    phase: "V1",
    auth: "Permisos del sistema",
    scope: "Ruta configurada",
    endpoint: config.root_path ?? "",
    description: `Conector ${config.display_name || providerName[id] || id} configurado`,
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    formats: config.file_filter.length > 0 ? config.file_filter : [".*"],
    permissions: ["Lectura de archivos configurados"],
    mcpServer: "",
    tools: ["container_list", "container_get"],
    indexTargets: ["Archivos locales"],
  }
}

export function ConnectorsPage() {
  const [catalogOpen, setCatalogOpen] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selectedProvider, setSelectedProvider] = React.useState<ConnectorProvider | null>(null)
  const [configs, setConfigs] = React.useState<ConnectorConfig[]>([])

  React.useEffect(() => {
    listConnectorConfigs("project-default").then(setConfigs).catch(() => {})
  }, [])

  const providers = configs.map(configToProvider)

  const openProvider = (provider: ConnectorProvider) => {
    setSelectedProvider(provider)
    setDialogOpen(true)
  }

  if (providers.length === 0) {
    return (
      <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
        <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-3">
          <header className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
            <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
            <div className="p-2.5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                    <CloudIcon className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                        Conectores de datos
                      </h1>
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-primary">
                        Beta V2
                      </span>
                    </div>
                    <p className="mt-0.5 max-w-3xl text-xs leading-4 text-muted-foreground">
                      Conecta OneDrive, SharePoint y otras fuentes para cargar
                      capas GIS, documentos POT y resultados sin salir de Geo Agents.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:pt-0.5">
                  <Button size="sm" onClick={() => setCatalogOpen(true)}>
                    <PlusIcon className="size-4" />
                    Agregar conector
                  </Button>
                  <Button variant="outline" size="sm">
                    <FolderSyncIcon className="size-4" />
                    Sincronizar beta
                  </Button>
                </div>
              </div>
            </div>
          </header>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
            <CloudIcon className="size-10 text-muted-foreground/40" />
            <h2 className="mt-3 text-sm font-semibold">Sin conectores configurados</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Agrega un conector desde la centralita para empezar a trabajar con tus datos.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setCatalogOpen(true)}>
              <PlusIcon className="size-4" />
              Agregar conector
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-3">
        <header className="overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
          <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
          <div className="p-2.5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                  <CloudIcon className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                      Conectores de datos
                    </h1>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-primary">
                      Beta V2
                    </span>
                  </div>
                  <p className="mt-0.5 max-w-3xl text-xs leading-4 text-muted-foreground">
                    Conecta OneDrive, SharePoint y otras fuentes para cargar
                    capas GIS, documentos POT y resultados sin salir de Geo Agents.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:pt-0.5">
                <Button size="sm" onClick={() => setCatalogOpen(true)}>
                  <PlusIcon className="size-4" />
                  Agregar conector
                </Button>
                <Button variant="outline" size="sm">
                  <FolderSyncIcon className="size-4" />
                  Sincronizar beta
                </Button>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {providers.map((provider) => (
            <ConnectorCard
              key={provider.id}
              provider={provider}
              onSelect={openProvider}
            />
          ))}
        </section>

      </div>

      <AddConnectorDialog
        open={catalogOpen}
        providers={providers}
        onOpenChange={setCatalogOpen}
        onSelectProvider={openProvider}
      />
      {selectedProvider && (
        <ConnectorSetupDialog
          open={dialogOpen}
          provider={selectedProvider}
          onOpenChange={setDialogOpen}
          onConfigSaved={() => {
            listConnectorConfigs("project-default").then(setConfigs).catch(() => {})
          }}
        />
      )}
    </section>
  )
}

