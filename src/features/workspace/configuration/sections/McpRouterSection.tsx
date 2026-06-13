import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { McpRegisterDialog } from "@/features/workspace/mcp/McpRegisterDialog"
import { McpServerCard } from "@/features/workspace/mcp/McpServerCard"
import { useMcpServers } from "@/features/workspace/mcp/hooks/useMcpServers"

export function McpRouterSection() {
  const { servers, loading, onlineCount, register, ping, refresh } = useMcpServers()
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">MCP Router</h3>
        <p className="mt-1 text-xs leading-4 text-muted-foreground">
          {servers.length} servidores registrados · {onlineCount} online
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {servers.map(server => (
          <McpServerCard
            key={server.id}
            server={server}
            isActive={server.id === selectedServerId}
            onSelect={() => setSelectedServerId(prev => prev === server.id ? null : server.id)}
            onPing={async () => { await ping(server.id) }}
            onEdit={() => console.log("Edit", server.id)}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setRegisterOpen(true)}>
          Agregar servidor
        </Button>
      </div>

      <McpRegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onRegistered={async (p) => { await register(p) }}
      />
    </div>
  )
}
