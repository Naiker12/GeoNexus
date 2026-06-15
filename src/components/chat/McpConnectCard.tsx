import * as React from "react"
import { Server, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/Button"

interface McpConnectCardProps {
  serverId?: string
  serverName?: string
  serverUrl?: string
  reason?: string
  onConnect?: () => void
}

export function McpConnectCard({ serverId, serverName, serverUrl, reason, onConnect }: McpConnectCardProps) {
  return (
    <div className="my-2 overflow-hidden rounded-lg border border-blue-500/30 bg-blue-500/5">
      <div className="flex items-center gap-2 p-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
          <Server className="size-4 text-blue-500" />
        </div>

        <div className="min-w-0 flex-1 text-xs">
          <p className="font-semibold leading-tight">
            Conectar servidor MCP {serverName ? `"${serverName}"` : ""}
          </p>
          {serverUrl && (
            <p className="mt-0.5 leading-tight text-muted-foreground font-mono">
              {serverUrl}
            </p>
          )}
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
          onClick={onConnect}
        >
          <ExternalLink className="size-3" />
          Conectar
        </Button>
      </div>
    </div>
  )
}