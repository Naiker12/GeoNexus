import { useState } from "react"
import { McpConfigEditor } from "@/features/workspace/mcp/McpConfigEditor"
import { McpConsole } from "@/features/workspace/mcp/McpConsole"
import { McpHeader } from "@/features/workspace/mcp/McpHeader"
import { McpRegisterDialog } from "@/features/workspace/mcp/McpRegisterDialog"
import { McpServerGrid } from "@/features/workspace/mcp/McpServerGrid"
import { McpToolsViewer } from "@/features/workspace/mcp/McpToolsViewer"
import { useMcpServers } from "@/features/workspace/mcp/hooks/useMcpServers"
import { useMcpTools } from "@/features/workspace/mcp/hooks/useMcpTools"
import { useToast } from "@/components/ui/toast"

export function McpServersPage() {
  const { servers, register, ping, refresh } = useMcpServers()
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [pingProgress, setPingProgress] = useState<{ current: number; total: number } | null>(null)
  const { tools } = useMcpTools(selectedServerId)
  const toast = useToast()

  const handlePingAll = async () => {
    const active = servers.filter(s => !s.disabled)
    const total = active.length
    if (total === 0) return

    setPingProgress({ current: 0, total })
    let onlineCount = 0

    for (let i = 0; i < total; i++) {
      setPingProgress({ current: i + 1, total })
      try {
        const result = await ping(active[i].id)
        if (result.online) onlineCount++
      } catch { /* skip */ }
    }

    setPingProgress(null)

    if (onlineCount === total) {
      toast.toast({ title: `${total} de ${total} servidores online`, variant: "success" })
    } else if (onlineCount > 0) {
      toast.toast({
        title: `${onlineCount} de ${total} servidores online`,
        description: `${total - onlineCount} offline`,
        variant: "warning",
      })
    } else {
      toast.toast({ title: `Todos los servidores offline (0/${total})`, variant: "error" })
    }
  }

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto grid w-full max-w-[110rem] gap-5">
        <McpHeader
          servers={servers}
          pingProgress={pingProgress}
          onRegister={() => setRegisterOpen(true)}
          onPingAll={handlePingAll}
          onOpenConfig={() => setConfigOpen(true)}
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
      <McpConfigEditor
        open={configOpen}
        onOpenChange={setConfigOpen}
        onImported={refresh}
      />
    </section>
  )
}
