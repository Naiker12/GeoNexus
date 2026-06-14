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
import { discoverStdioTools } from "@/api/mcp"
import type { McpServer } from "@/types/mcp"

export function McpServersPage() {
  const { servers, error, register, ping, refresh } = useMcpServers()
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<McpServer | null>(null)
  const [pingProgress, setPingProgress] = useState<{ current: number; total: number } | null>(null)
  const { tools, error: toolsError, refresh: refreshTools } = useMcpTools(selectedServerId)
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

  const handleDiscoverTools = async (serverId: string) => {
    try {
      const count = await discoverStdioTools(serverId)
      toast.toast({ title: `${count} tools descubiertas para el servidor STDIO`, variant: "success" })
      setSelectedServerId(serverId)
      refreshTools()
    } catch (e) {
      toast.toast({ title: `Error descubriendo tools: ${e}`, variant: "error" })
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
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[11px] text-destructive flex items-start gap-2">
              <span className="size-1.5 mt-0.5 rounded-full bg-destructive shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {toolsError && selectedServerId && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[11px] text-destructive flex items-start gap-2">
              <span className="size-1.5 mt-0.5 rounded-full bg-destructive shrink-0" />
              <span>Tools: {toolsError}</span>
            </div>
          )}
          <McpServerGrid
            servers={servers}
            activeServerId={selectedServerId}
            onSelectServer={setSelectedServerId}
            onPingServer={ping}
            onEditServer={(id: string) => { const s = servers.find(s => s.id === id); if (s) { setEditingServer(s); setRegisterOpen(true) } }}
            onDiscoverTools={handleDiscoverTools}
          />
          <McpToolsViewer serverId={selectedServerId} tools={tools} />
          <McpConsole />
        </div>
      </div>
      <McpRegisterDialog
        open={registerOpen}
        onOpenChange={(v) => { if (!v) setEditingServer(null); setRegisterOpen(v) }}
        onRegistered={async (p) => { await register(p); setEditingServer(null) }}
        editing={editingServer}
      />
      <McpConfigEditor
        open={configOpen}
        onOpenChange={setConfigOpen}
        onImported={refresh}
      />
    </section>
  )
}
