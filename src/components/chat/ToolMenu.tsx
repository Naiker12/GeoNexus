import * as React from "react"
import {
  CpuIcon,
  FolderIcon,
  GlobeIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  ZapIcon,
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { ConnectorStatusBadge } from "@/components/chat/ConnectorStatusBadge"
import { ConnectorMiniPanel } from "@/components/chat/ConnectorMiniPanel"
import { ConnectorConnectionDialog } from "@/components/chat/ConnectorConnectionDialog"
import { useCodingAgent } from "@/contexts/CodingAgentContext"
import type { MentionableSourceItem } from "@/types/chat"

export type ToolMenuProps = {
  webSearchEnabled: boolean
  onToggleWebSearch: () => void
  connectors: any[]
  refreshSources: () => void
  onAttachFiles: () => void
  onToggleCoding?: () => void
}

export function ToolMenu({
  webSearchEnabled,
  onToggleWebSearch,
  connectors,
  refreshSources,
  onAttachFiles,
  onToggleCoding,
}: ToolMenuProps) {
  const codingAgent = useCodingAgent()
  const [expandedConnector, setExpandedConnector] = React.useState<string | null>(null)
  const [connectingConnector, setConnectingConnector] = React.useState<MentionableSourceItem | null>(null)

  return (
    <>
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open) {
            setExpandedConnector(null)
          }
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
            <DropdownMenuLabel>Proyecto</DropdownMenuLabel>
            <DropdownMenuItem className="min-h-8 gap-2 px-2.5 py-1.5">
              <SparklesIcon className="size-3.5 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">Agregar proyecto</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-8 gap-2 px-2.5 py-1.5">
              <MenuIcon className="size-3.5 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">Configurar proyecto</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Archivos y datos</DropdownMenuLabel>
            <DropdownMenuItem
              className="min-h-8 gap-2 px-2.5 py-1.5"
              onSelect={onAttachFiles}
            >
              <PlusIcon className="size-3.5 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">
                Agregar fotos y archivos
              </span>
              <DropdownMenuShortcut className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium tracking-normal text-muted-foreground">
                PDF/DXF
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            {connectors.map((c) => (
              <React.Fragment key={c.id}>
                <DropdownMenuItem
                  className="min-h-8 gap-2 px-2.5 py-1.5"
                  onSelect={(e) => {
                    if (c.status === "connected" || c.status === "error") {
                      e.preventDefault()
                      setExpandedConnector(
                        expandedConnector === c.id ? null : c.id
                      )
                    } else if (c.status === "disconnected") {
                      setConnectingConnector(c)
                    }
                  }}
                >
                  <CpuIcon className="size-3.5 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  {c.status && <ConnectorStatusBadge status={c.status} />}
                </DropdownMenuItem>
                {expandedConnector === c.id && (
                  <ConnectorMiniPanel
                    connector={c}
                    onClose={() => setExpandedConnector(null)}
                    onSync={
                      c.status === "connected"
                        ? () => {
                            // TODO: trigger sync
                            setExpandedConnector(null)
                          }
                        : undefined
                    }
                  />
                )}
              </React.Fragment>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Herramientas GIS</DropdownMenuLabel>
            <DropdownMenuItem className="gap-3 px-3 py-2">
              <SearchIcon className="size-4" />
              Razonamiento GIS
              <DropdownMenuShortcut>MCP</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center justify-between gap-2 px-3 py-2"
              onSelect={(e) => e.preventDefault()}
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
            <DropdownMenuItem
              className="flex items-center justify-between gap-2 px-3 py-2"
              onSelect={(e) => e.preventDefault()}
            >
              <div className="flex items-center gap-3">
                <ZapIcon className="size-4 text-muted-foreground" />
                <span className="text-sm">Coding Agent</span>
              </div>
              <Switch
                checked={codingAgent.state.isActive}
                onCheckedChange={codingAgent.toggleCodingMode}
                className="scale-75"
                aria-label="Activar coding agent"
              />
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-3 px-3 py-2">
                <PlusIcon className="size-4" />
                Más
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56 rounded-xl p-2">
                {connectors.length > 0 ? (
                  connectors.map((c) => (
                    <DropdownMenuItem key={c.id} className="gap-3 px-3 py-2">
                      <CpuIcon className="size-3.5" />
                      {c.label}
                      {c.status && <ConnectorStatusBadge status={c.status} />}
                    </DropdownMenuItem>
                  ))
                ) : (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No hay conectores activos
                    </div>
                  )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem className="gap-3 px-3 py-2">
              <SparklesIcon className="size-4" />
              Proyectos
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
