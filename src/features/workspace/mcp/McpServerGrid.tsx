import { McpServerCard } from "@/features/workspace/mcp/McpServerCard"
import { McpServerRow } from "@/features/workspace/mcp/McpServerRow"
import type { McpServer } from "@/types/mcp"

export type McpViewMode = "grid" | "list"

interface McpServerGridProps {
  servers: McpServer[]
  activeServerId: string | null
  viewMode?: McpViewMode
  onSelectServer: (serverId: string) => void
  onPingServer: (serverId: string) => Promise<unknown>
  onEditServer: (serverId: string) => void
  onDeleteServer?: (serverId: string) => Promise<void>
  onDiscoverTools: (serverId: string) => Promise<void>
}

export function McpServerGrid({
  servers,
  activeServerId,
  viewMode = "grid",
  onSelectServer,
  onPingServer,
  onEditServer,
  onDeleteServer,
  onDiscoverTools,
}: McpServerGridProps) {
  if (servers.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">No hay servidores MCP registrados</p>
        <p className="text-xs text-muted-foreground mt-1">Agrega uno desde el botón "Registrar servidor"</p>
      </section>
    )
  }

  if (viewMode === "list") {
    return (
      <section className="flex flex-col gap-0.5 rounded-lg border border-border bg-card/50 p-1">
        {servers.map(server => (
          <McpServerRow
            key={server.id}
            server={server}
            isActive={server.id === activeServerId}
            onSelect={() => onSelectServer(server.id)}
            onPing={() => onPingServer(server.id)}
            onEdit={() => onEditServer(server.id)}
onDelete={async () => { await onDeleteServer?.(server.id) }}
            onDiscoverTools={() => onDiscoverTools(server.id)}
          />
        ))}
      </section>
    )
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {servers.map(server => (
        <McpServerCard
          key={server.id}
          server={server}
          isActive={server.id === activeServerId}
          onSelect={() => onSelectServer(server.id)}
          onPing={() => onPingServer(server.id)}
          onEdit={() => onEditServer(server.id)}
          onDelete={async () => { await onDeleteServer?.(server.id) }}
          onDiscoverTools={() => onDiscoverTools(server.id)}
        />
      ))}
    </section>
  )
}
