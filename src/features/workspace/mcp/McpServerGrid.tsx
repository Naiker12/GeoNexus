import { McpServerCard } from "@/features/workspace/mcp/McpServerCard"
import { mcpServers } from "@/features/workspace/mcp/mcp-data"

type McpServerGridProps = {
  activeServerId: string | null
  onSelectServer: (serverId: string) => void
}

export function McpServerGrid({
  activeServerId,
  onSelectServer,
}: McpServerGridProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {mcpServers.map((server) => (
        <McpServerCard
          key={server.id}
          server={server}
          isActive={server.id === activeServerId}
          onSelect={() => onSelectServer(server.id)}
          onPing={() => console.log("Ping", server.id)}
          onEdit={() => console.log("Edit", server.id)}
        />
      ))}
    </section>
  )
}
