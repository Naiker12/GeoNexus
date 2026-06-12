import * as React from "react"
import {
  CpuIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  FileIcon,
  FolderOpenIcon,
  Loader2Icon,
  RefreshCwIcon,
  RouteIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { ConnectorStatusBadge } from "@/components/chat/ConnectorStatusBadge"
import { registerLocalConnector } from "@/api/connector"
import type { MentionableSourceItem } from "@/types/chat"
import { invoke } from "@tauri-apps/api/core"
import { cn } from "@/lib/utils"
import { useOAuthFlow } from "@/features/workspace/connectors/hooks/useOAuthFlow"

const CLOUD_PROVIDERS = new Set(["onedrive", "google_drive", "googledrive", "sharepoint", "dropbox"])

const PROVIDER_META: Record<string, { name: string; icon: string; color: string }> = {
  onedrive: { name: "OneDrive", icon: "Cloud", color: "#0078D4" },
  local: { name: "Local", icon: "Folder", color: "#F59E0B" },
  dropbox: { name: "Dropbox", icon: "Cloud", color: "#0061FF" },
  google_drive: { name: "Google Drive", icon: "Cloud", color: "#34A853" },
  sharepoint: { name: "SharePoint", icon: "Cloud", color: "#0078D4" },
  mcp: { name: "MCP", icon: "Cpu", color: "#6366F1" },
}

type Props = {
  connector: MentionableSourceItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnected: () => void
}

export function ConnectorConnectionDialog({
  connector,
  open,
  onOpenChange,
  onConnected,
}: Props) {
  const { toast } = useToast()
  const [connecting, setConnecting] = React.useState(false)
  const [folderPath, setFolderPath] = React.useState("")

  const oauth = useOAuthFlow(
    (connector.provider as "onedrive" | "dropbox" | "google_drive" | "sharepoint") ?? "onedrive"
  )

  React.useEffect(() => {
    if (oauth.status === "connected") {
      toast({
        title: "Conectado",
        description: `${connector.label} conectado exitosamente.`,
        variant: "success",
      })
      onConnected()
      onOpenChange(false)
    } else if (oauth.status === "error" && oauth.error) {
      toast({
        title: "Error de conexión",
        description: oauth.error,
        variant: "error",
      })
    }
  }, [oauth.status])

  React.useEffect(() => {
    setConnecting(false)
    setFolderPath("")
    oauth.reset()
  }, [connector.id, open])

  const prov = connector.provider ?? ""
  const isCloud = CLOUD_PROVIDERS.has(prov)
  const isLocal = prov === "local"
  const isMcp = prov === "mcp"
  const meta = PROVIDER_META[prov] ?? { name: connector.label, icon: "Cpu", color: "#6366F1" }

  const pickFolder = async () => {
    try {
      const folder = await invoke<string | null>("open_folder_picker")
      if (folder) setFolderPath(folder)
    } catch (err) {
      toast({ title: "Error", description: `No se pudo abrir el selector: ${err}`, variant: "error" })
    }
  }

  const handleLocalConnect = async () => {
    if (!folderPath.trim()) return
    setConnecting(true)
    try {
      await registerLocalConnector({
        project_id: "project-default",
        workspace_id: "workspace-main",
        display_name: connector.label,
        root_path: folderPath.trim(),
        file_filter: [".geojson", ".shp", ".dxf", ".pdf", ".csv", ".xlsx", ".zip", ".kml"],
        max_file_mb: 500,
      })
      toast({
        title: "Conector local registrado",
        description: `${connector.label} configurado en ${folderPath}`,
        variant: "success",
      })
      onConnected()
      onOpenChange(false)
    } catch (err) {
      toast({ title: "Error al conectar", description: `${err}`, variant: "error" })
    } finally {
      setConnecting(false)
    }
  }

  const handleCloudOAuth = async () => {
    setConnecting(true)
    try {
      await oauth.connect()
    } catch (err) {
      toast({ title: "Error de conexion", description: `${err}`, variant: "error" })
    } finally {
      setConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[min(94vw,42rem)] max-h-[min(90svh,32rem)] flex-col rounded-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-3.5">
          <div className="flex items-start gap-3 pr-8">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border"
              style={{ borderColor: `${meta.color}30`, backgroundColor: `${meta.color}15` }}
            >
              <CpuIcon className="size-4.5" style={{ color: meta.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2 text-base">
                {connector.label}
                <ConnectorStatusBadge status={connector.status} />
              </DialogTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {isMcp
                  ? "Los conectores MCP se configuran desde la seccion de MCP en Ajustes."
                  : isCloud
                    ? `Conecta con tu cuenta de ${connector.label} — OAuth 2.0 PKCE`
                    : "Configura la carpeta local como fuente de datos"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 [scrollbar-width:thin]">
          {isMcp ? (
            <div className="col-span-full rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              {isMcp && "Los conectores MCP se configuran desde la seccion de MCP en Ajustes."}
            </div>
          ) : isCloud ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <ConnectorInfoPanel
                title="Qué conecta"
                items={[
                  "Carpetas GIS y documentos POT",
                  "Archivos compartidos del equipo",
                  "Sincronización automática",
                ]}
                icon={DatabaseIcon}
              />
              <ConnectorInfoPanel
                title="Permisos"
                items={[
                  "Leer archivos y metadatos",
                  "Descargar al caché local",
                  "Subir con confirmación explícita",
                ]}
                icon={ShieldCheckIcon}
              />
              <ConnectorInfoPanel
                title="Herramientas MCP"
                items={["container_list", "container_search", "container_get", "container_sync"]}
                icon={WrenchIcon}
              />
              <ConnectorInfoPanel
                title="Indexa en Geo Agents"
                items={["PDF · Excel · CSV", "GeoJSON · Shapefile", "Documentos POT"]}
                icon={DatabaseIcon}
              />
              <div className="lg:col-span-2 rounded-lg border border-border bg-muted/40 p-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <RouteIcon className="size-4 text-primary" />
                  Cómo funciona
                </div>
                <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
                  Connector Manager recibe la solicitud, valida permisos, crea el
                  conector, envía archivos al indexador, genera embeddings en ChromaDB y
                  actualiza el Knowledge Graph.
                </p>
              </div>
              <div className="lg:col-span-2 rounded-lg border border-border bg-background/70 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Formatos</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[".geojson", ".shp", ".dxf", ".pdf", ".csv", ".xlsx", ".kml", ".gpkg"].map((fmt) => (
                    <span key={fmt} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/45 px-2 py-1 text-xs text-muted-foreground">
                      <FileIcon className="size-3" />
                      {fmt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : isLocal ? (
            <div className="flex flex-col gap-4">
              <ConnectorInfoPanel
                title="Qué conecta"
                items={["Carpeta local del sistema de archivos", "Escaneo recursivo de documentos GIS", "Filtro por extensión configurable"]}
                icon={FolderOpenIcon}
              />
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Carpeta local</p>
                <div className="flex items-center gap-2">
                  <input
                    className="h-9 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm outline-none transition focus:border-primary/50 focus:ring-3 focus:ring-ring/30"
                    placeholder="/ruta/a/carpeta"
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                  />
                  <Button variant="outline" size="sm" type="button" onClick={pickFolder}>
                    <FolderOpenIcon className="size-4" />
                    Examinar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="col-span-full rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Conexion para <strong>{connector.label}</strong> no disponible aun.
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-5 py-3 flex items-center justify-end gap-2 bg-muted/20">
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {isCloud && (
            <Button
              size="sm"
              className="gap-2"
              onClick={handleCloudOAuth}
              disabled={connecting || oauth.status === "pending"}
            >
              {connecting || oauth.status === "pending" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <ExternalLinkIcon className="size-4" />
              )}
              {connecting || oauth.status === "pending" ? "Conectando..." : `Conectar con ${connector.label}`}
            </Button>
          )}
          {isLocal && (
            <Button
              size="sm"
              type="button"
              onClick={handleLocalConnect}
              disabled={connecting || !folderPath.trim()}
            >
              {connecting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" />
              )}
              {connecting ? "Conectando..." : "Conectar"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ConnectorInfoPanel({ title, items, icon: Icon }: { title: string; items: string[]; icon: typeof DatabaseIcon }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-3.5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" />
        {title}
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/40" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
