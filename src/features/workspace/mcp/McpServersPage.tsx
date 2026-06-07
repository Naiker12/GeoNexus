import * as React from "react"

import { McpConsole } from "@/features/workspace/mcp/McpConsole"
import { McpHeader } from "@/features/workspace/mcp/McpHeader"
import { McpRegisterDialog } from "@/features/workspace/mcp/McpRegisterDialog"
import { McpServerGrid } from "@/features/workspace/mcp/McpServerGrid"
import { McpToolsViewer } from "@/features/workspace/mcp/McpToolsViewer"

export function McpServersPage() {
  const [selectedServerId, setSelectedServerId] = React.useState<string | null>(null)
  const [registerOpen, setRegisterOpen] = React.useState(false)

  const handleSelectServer = (serverId: string) => {
    setSelectedServerId((prev) => (prev === serverId ? null : serverId))
  }

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto grid w-full max-w-[110rem] gap-5">
        <McpHeader onRegister={() => setRegisterOpen(true)} />
        
        <div className="grid gap-5">
          <McpServerGrid
            activeServerId={selectedServerId}
            onSelectServer={handleSelectServer}
          />
          
          <McpToolsViewer serverId={selectedServerId} />
          
          <McpConsole />
        </div>
      </div>
      
      <McpRegisterDialog open={registerOpen} onOpenChange={setRegisterOpen} />
    </section>
  )
}
