import * as React from "react"
import {
  CpuIcon,
  ExternalLinkIcon,
  FolderOpenIcon,
  Loader2Icon,
  RefreshCwIcon,
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
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
  ONEDRIVE_CONFIG,
} from "@/config/oauth"
import type { MentionableSourceItem } from "@/types/chat"
import { invoke } from "@tauri-apps/api/core"

const CLOUD_PROVIDERS = new Set(["onedrive", "google_drive", "googledrive", "sharepoint", "dropbox"])

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

  React.useEffect(() => {
    setConnecting(false)
    setFolderPath("")
  }, [connector.id, open])

  const prov = connector.provider ?? ""
  const isCloud = CLOUD_PROVIDERS.has(prov)
  const isLocal = prov === "local"
  const isMcp = prov === "mcp"

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
      const { openUrl } = await import("@tauri-apps/plugin-opener")
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)
      const authUrl = buildAuthUrl(ONEDRIVE_CONFIG, challenge)
      await openUrl(authUrl)
      await invoke("save_oauth_token", {
        provider: connector.provider,
        tokenJson: JSON.stringify({ status: "pending", provider: connector.provider }),
      })
      toast({
        title: "Navegador abierto",
        description: `Completa el inicio de sesion de ${connector.label} en el navegador.`,
        variant: "success",
      })
      onConnected()
      onOpenChange(false)
    } catch (err) {
      toast({ title: "Error de conexion", description: `${err}`, variant: "error" })
    } finally {
      setConnecting(false)
    }
  }

  const description = isMcp
    ? "Los conectores MCP se configuran desde la seccion de MCP en Ajustes."
    : isCloud
    ? `Conecta con tu cuenta de ${connector.label}`
    : "Configura la carpeta local como fuente de datos"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,28rem)] rounded-lg p-0">
        <DialogHeader className="border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border text-indigo-500 bg-indigo-500/10 border-indigo-500/20">
              <CpuIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                {connector.label}
                <ConnectorStatusBadge status={connector.status} />
              </DialogTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4">
          {isMcp ? (
            <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              {description}
            </div>
          ) : isCloud ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/20 p-6">
              <p className="text-center text-sm text-muted-foreground">
                Te enviaremos al navegador para iniciar sesion con <strong>{connector.label}</strong>.
              </p>
              <Button
                size="lg"
                className="w-full max-w-xs gap-2"
                onClick={handleCloudOAuth}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2Icon className="size-5 animate-spin" />
                ) : (
                  <ExternalLinkIcon className="size-5" />
                )}
                {connecting ? "Abriendo navegador..." : `Continuar con ${connector.label}`}
              </Button>
            </div>
          ) : isLocal ? (
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
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
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
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Conexion para <strong>{connector.label}</strong> no disponible aun.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
