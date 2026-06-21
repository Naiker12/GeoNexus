import * as React from "react"
import {
  CpuIcon,
  GlobeIcon,
  PlusIcon,
  ServerIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { ConnectorStatusBadge } from "@/components/chat/ConnectorStatusBadge"
import { ConnectorMiniPanel } from "@/components/chat/ConnectorMiniPanel"
import { ConnectorConnectionDialog } from "@/components/chat/ConnectorConnectionDialog"
import { useAgentTaskStore } from "@/features/agent/store/useAgentTaskStore"
import type { MentionableSourceItem } from "@/types/chat"

export type ToolMenuProps = {
  webSearchEnabled: boolean
  onToggleWebSearch: () => void
  connectors: MentionableSourceItem[]
  mcpServers: MentionableSourceItem[]
  refreshSources: () => void
  onAttachFiles: () => void
}

export function ToolMenu({
  webSearchEnabled,
  onToggleWebSearch,
  connectors,
  mcpServers,
  refreshSources,
  onAttachFiles,
}: ToolMenuProps) {
  const mode = useAgentTaskStore((s) => s.mode)
  const setMode = useAgentTaskStore((s) => s.setMode)
  const [expandedConnector, setExpandedConnector] = React.useState<string | null>(null)
  const [connectingConnector, setConnectingConnector] = React.useState<MentionableSourceItem | null>(null)

  return (
    <>
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) setExpandedConnector(null)
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="rounded-xl"
            aria-label="Abrir herramientas"
          >
            <PlusIcon className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={10}
          className="w-80 rounded-xl p-2"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>Fuentes activas</DropdownMenuLabel>
            <DropdownMenuItem
              className="min-h-8 gap-2 px-2.5 py-1.5"
              onSelect={onAttachFiles}
            >
              <PlusIcon className="size-3.5 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">Agregar fotos y archivos</span>
              <DropdownMenuShortcut className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium tracking-normal text-muted-foreground">
                PDF/DXF
              </DropdownMenuShortcut>
            </DropdownMenuItem>

            {connectors.map((connector) => (
              <React.Fragment key={connector.id}>
                <DropdownMenuItem
                  className="min-h-8 gap-2 px-2.5 py-1.5"
                  onSelect={(event) => {
                    if (connector.status === "connected" || connector.status === "error") {
                      event.preventDefault()
                      setExpandedConnector(expandedConnector === connector.id ? null : connector.id)
                    } else if (connector.status === "disconnected") {
                      setConnectingConnector(connector)
                    }
                  }}
                >
                  <CpuIcon className="size-3.5 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{connector.label}</span>
                  {connector.status && <ConnectorStatusBadge status={connector.status} />}
                </DropdownMenuItem>
                {expandedConnector === connector.id && (
                  <ConnectorMiniPanel
                    connector={connector}
                    onClose={() => setExpandedConnector(null)}
                    onSync={
                      connector.status === "connected"
                        ? () => setExpandedConnector(null)
                        : undefined
                    }
                  />
                )}
              </React.Fragment>
            ))}

            {mcpServers.map((server) => (
              <DropdownMenuItem
                key={server.id}
                className="min-h-8 gap-2 px-2.5 py-1.5"
              >
                <ServerIcon className="size-3.5 text-indigo-500" />
                <span className="min-w-0 flex-1 truncate">{server.label}</span>
                <ConnectorStatusBadge status="mcp" />
              </DropdownMenuItem>
            ))}

            {connectors.length === 0 && mcpServers.length === 0 && (
              <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                No hay conectores ni MCP activos
              </div>
            )}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="sr-only">Modo de trabajo</DropdownMenuLabel>
            <div className="px-3 py-2">
              <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Modo de trabajo
              </p>
              <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setMode("chat")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    mode === "chat"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => setMode("agent")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    mode === "agent"
                      ? "bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Agente
                </button>
              </div>
              {mode === "agent" && (
                <p className="mt-1 text-[10px] leading-tight text-amber-600">
                  El texto que escribas se convertirá en una tarea para el agente
                </p>
              )}
            </div>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Busqueda</DropdownMenuLabel>
            <DropdownMenuItem
              className="flex items-center justify-between gap-2 px-3 py-2"
              onSelect={(event) => event.preventDefault()}
            >
              <div className="flex items-center gap-3">
                <GlobeIcon className="size-4 text-muted-foreground" />
                <span className="text-sm">Buscar informacion</span>
              </div>
              <Switch
                checked={webSearchEnabled}
                onCheckedChange={onToggleWebSearch}
                className="scale-75"
                aria-label="Activar busqueda en internet"
              />
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {connectingConnector && (
        <ConnectorConnectionDialog
          connector={connectingConnector}
          open={!!connectingConnector}
          onOpenChange={() => setConnectingConnector(null)}
          onConnected={() => {
            setConnectingConnector(null)
            refreshSources()
          }}
        />
      )}
    </>
  )
}
