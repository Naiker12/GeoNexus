import * as React from "react"
import {
  CheckCircle2Icon,
  CloudIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  FolderOpenIcon,
  Loader2Icon,
  RouteIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { ConnectorInfoPanel } from "@/features/workspace/connectors/ConnectorInfoPanel"
import { ConnectorLogo } from "@/features/workspace/connectors/ConnectorLogo"
import { InfoRow } from "@/features/workspace/connectors/InfoRow"
import { registerLocalConnector } from "@/api/connector"
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
  ONEDRIVE_CONFIG,
} from "@/config/oauth"
import type { ConnectorProvider } from "@/features/workspace/connectors/connector-types"
import { cn } from "@/lib/utils"
import { invoke } from "@tauri-apps/api/core"

type ConnectorSetupDialogProps = {
  open: boolean
  provider: ConnectorProvider
  onOpenChange: (open: boolean) => void
  onConfigSaved?: () => void
}

function isCloudProvider(provider: ConnectorProvider): boolean {
  return ["onedrive", "google-drive", "sharepoint", "dropbox"].includes(provider.id)
}

export function ConnectorSetupDialog({
  open,
  provider,
  onOpenChange,
  onConfigSaved,
}: ConnectorSetupDialogProps) {
  const { toast, loading: showLoading, dismiss } = useToast()
  const [connecting, setConnecting] = React.useState(false)
  const [connected, setConnected] = React.useState(false)
  const [folderPath, setFolderPath] = React.useState("")

  React.useEffect(() => {
    setConnected(false)
    setConnecting(false)
    setFolderPath("")
  }, [provider.id, open])

  const pickFolder = async () => {
    try {
      const folder = await invoke<string | null>("open_folder_picker")
      if (folder) setFolderPath(folder)
    } catch (err) {
      toast({ title: "Error", description: `No se pudo abrir el selector: ${err}`, variant: "error" })
    }
  }

  const handleLocalConnect = async () => {
    if (!folderPath.trim()) {
      toast({ title: "Selecciona una carpeta", description: "Debes elegir una carpeta local primero.", variant: "warning" })
      return
    }
    setConnecting(true)
    const loadingId = showLoading("Conectando...", `Registrando ${provider.name} en ${folderPath}`)
    try {
      await registerLocalConnector({
        project_id: "project-default",
        workspace_id: "workspace-main",
        display_name: provider.name,
        root_path: folderPath.trim(),
        file_filter: provider.formats.map((f) => f.startsWith(".") ? f : `.${f}`),
        max_file_mb: 500,
      })
      dismiss(loadingId)
      setConnected(true)
      onConfigSaved?.()
      toast({ title: "Conector local registrado", description: `${provider.name} configurado en ${folderPath}`, variant: "success" })
    } catch (err) {
      dismiss(loadingId)
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
        provider: provider.id,
        tokenJson: JSON.stringify({ status: "pending", provider: provider.id }),
      })

      onConfigSaved?.()
      toast({ title: "Navegador abierto", description: `Completa el inicio de sesion de ${provider.name} en el navegador.`, variant: "success" })
    } catch (err) {
      toast({ title: "Error de conexion", description: `${err}`, variant: "error" })
    } finally {
      setConnecting(false)
    }
  }

  const isCloud = isCloudProvider(provider)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[calc(50%+1rem)] flex max-h-[calc(100svh-6rem)] w-[min(94vw,48rem)] flex-col overflow-hidden rounded-lg p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                provider.accent
              )}
            >
              <ConnectorLogo provider={provider} className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">{provider.name}</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5">
                {isCloud
                  ? `Conecta ${provider.name} con un solo clic. Te enviaremos al navegador para iniciar sesion.`
                  : `Configura ${provider.name} como fuente de datos local para Geo Agents.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 gap-4 overflow-auto p-4 [scrollbar-width:thin]">
          <section className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
            <ConnectorSummary provider={provider} />
            <ConnectorCapabilityPanels provider={provider} />
          </section>

          <ConnectorFormats formats={provider.formats} />

          <div className="flex flex-col gap-3 border-t border-border pt-3">
            {isCloud ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/20 p-6">
                <div className={cn("flex size-16 items-center justify-center rounded-2xl border-2", provider.accent)}>
                  <ConnectorLogo provider={provider} className="size-8" />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Conecta con tu cuenta de <strong>{provider.name}</strong>. Te enviaremos al navegador.
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
                  {connecting ? "Abriendo navegador..." : `Continuar con ${provider.name}`}
                </Button>
              </div>
            ) : (
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
                  <Button size="sm" type="button" onClick={handleLocalConnect} disabled={connecting || connected || !folderPath.trim()}>
                    {connecting ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : connected ? (
                      <CheckCircle2Icon className="size-4" />
                    ) : null}
                    {connecting ? "Conectando..." : connected ? "Conectado" : "Conectar"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ConnectorSummary({ provider }: { provider: ConnectorProvider }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-3">
      <div className={cn("flex size-12 items-center justify-center rounded-lg border", provider.accent)}>
        <ConnectorLogo provider={provider} className="size-7" />
      </div>
      <h3 className="mt-3 text-sm font-semibold">Que conecta</h3>
      <p className="mt-1 text-sm leading-5 text-muted-foreground">{provider.description}</p>
      <div className="mt-3 grid gap-2 text-xs">
        <InfoRow label="Autenticacion" value={provider.auth} />
        <InfoRow label="Scope base" value={provider.scope} />
        <InfoRow label="Endpoint" value={provider.endpoint} />
        <InfoRow label="Roadmap" value={provider.phase} />
      </div>
    </div>
  )
}

function ConnectorCapabilityPanels({ provider }: { provider: ConnectorProvider }) {
  return (
    <div className="grid gap-3">
      <ConnectorInfoPanel icon={ShieldCheckIcon} title="Permisos solicitados" items={provider.permissions} />
      <ConnectorInfoPanel icon={WrenchIcon} title="Herramientas MCP" items={provider.tools} />
      <ConnectorInfoPanel icon={DatabaseIcon} title="Indexa en Geo Agents" items={provider.indexTargets} />
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <RouteIcon className="size-4 text-primary" />
          Como funciona
        </div>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          Connector Manager recibe la solicitud, valida permisos, crea el
          conector, envia archivos al indexador, genera embeddings en ChromaDB y
          actualiza el Knowledge Graph para Geo Agents.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">MCP: {provider.mcpServer}</p>
      </div>
    </div>
  )
}

function ConnectorFormats({ formats }: { formats: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Formatos compatibles</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {formats.map((format) => (
          <span key={format} className="rounded-md border border-border bg-muted/45 px-2 py-1 text-xs text-muted-foreground">
            {format}
          </span>
        ))}
      </div>
    </div>
  )
}
