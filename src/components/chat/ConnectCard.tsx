import * as React from "react"
import { CloudIcon, ExternalLinkIcon } from "lucide-react"

import { Button } from "@/components/ui/Button"

interface ConnectCardProps {
  connectorId: string
  name?: string
  reason?: string
  onConnect?: (connectorId: string) => void
}

const connectorLabel: Record<string, string> = {
  local: "Carpeta local",
  onedrive: "OneDrive",
  sharepoint: "SharePoint",
  "google-drive": "Google Drive",
  dropbox: "Dropbox",
  "arcgis-pro": "ArcGIS Pro",
  "api-rest": "API externa",
  s3: "S3 / MinIO",
}

function getConnectorName(connectorId: string): string {
  return connectorLabel[connectorId] ?? connectorId
}

export function ConnectCard({ connectorId, name, reason, onConnect }: ConnectCardProps) {
  const displayName = name ?? getConnectorName(connectorId)

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/5">
      <div className="flex items-center gap-2 p-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
          <CloudIcon className="size-4 text-amber-500" />
        </div>

        <div className="min-w-0 flex-1 text-xs">
          <p className="font-semibold leading-tight">
            Conecta {displayName}
          </p>
          {reason && (
            <p className="mt-0.5 leading-tight text-muted-foreground">
              {reason}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0 h-6 gap-1 px-2 text-[0.65rem]"
          onClick={() => onConnect?.(connectorId)}
        >
          <ExternalLinkIcon className="size-3" />
          Conectar
        </Button>
      </div>
    </div>
  )
}

export function ConnectCardInline({ connectorId, reason }: { connectorId: string; reason?: string }) {
  const [connecting, setConnecting] = React.useState(false)

  const handleConnect = () => {
    setConnecting(true)
    const event = new CustomEvent("geonexus:open-connector", {
      detail: { connectorId },
    })
    window.dispatchEvent(event)
    setConnecting(false)
  }

  const displayName = getConnectorName(connectorId)

  return (
    <div className="my-1 flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
      <CloudIcon className="size-4 shrink-0 text-amber-500" />
      <div className="min-w-0 flex-1 text-xs leading-tight">
        <span className="font-medium">{displayName}</span>
        {reason && (
          <span className="ml-1 text-muted-foreground">— {reason}</span>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 h-6 px-2 text-[0.6rem]"
        onClick={handleConnect}
        disabled={connecting}
      >
        {connecting ? "..." : "Conectar"}
      </Button>
    </div>
  )
}
