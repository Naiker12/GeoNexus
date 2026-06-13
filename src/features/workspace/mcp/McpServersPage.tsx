import { useState } from "react"
import { McpConsole } from "@/features/workspace/mcp/McpConsole"
import { McpHeader } from "@/features/workspace/mcp/McpHeader"
import { McpRegisterDialog } from "@/features/workspace/mcp/McpRegisterDialog"
import { McpServerGrid } from "@/features/workspace/mcp/McpServerGrid"
import { McpToolsViewer } from "@/features/workspace/mcp/McpToolsViewer"
import { useMcpServers } from "@/features/workspace/mcp/hooks/useMcpServers"
import { useMcpTools } from "@/features/workspace/mcp/hooks/useMcpTools"

export function McpServersPage() {
  const { servers, loading, onlineCount, register, ping, refresh } = useMcpServers()
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const { tools } = useMcpTools(selectedServerId)

  const handlePingAll = async () => {
    for (const s of servers) {
      await ping(s.id)
    }
  }

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto grid w-full max-w-[110rem] gap-5">
        <McpHeader
          servers={servers}
          onRegister={() => setRegisterOpen(true)}
          onPingAll={handlePingAll}
        />
        <div className="grid gap-5">
          <McpServerGrid
            servers={servers}
            activeServerId={selectedServerId}
            onSelectServer={setSelectedServerId}
            onPingServer={ping}
            onEditServer={console.log}
          />
          <McpToolsViewer serverId={selectedServerId} tools={tools} />
          <McpConsole />
        </div>
      </div>
      <McpRegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onRegistered={async (p) => { await register(p) }}
      />
    </section>
  )
}
