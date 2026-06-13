import { McpServerCard } from "@/features/workspace/mcp/McpServerCard"
import type { McpServer } from "@/types/mcp"

interface McpServerGridProps {
  servers: McpServer[]
  activeServerId: string | null
  onSelectServer: (serverId: string) => void
  onPingServer: (serverId: string) => Promise<unknown>
  onEditServer: (serverId: string) => void
}

export function McpServerGrid({
  servers,
  activeServerId,
  onSelectServer,
  onPingServer,
  onEditServer,
}: McpServerGridProps) {
  if (servers.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">No hay servidores MCP registrados</p>
        <p className="text-xs text-muted-foreground mt-1">Agrega uno desde el botón "Registrar servidor"</p>
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
        />
      ))}
    </section>
  )
}
