import { useState, useEffect } from "react"
import { listMcpTools } from "@/api/mcp"
import type { McpTool } from "@/types/mcp"

export function useMcpTools(serverId: string | null) {
  const [tools, setTools] = useState<McpTool[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!serverId) {
      setTools([])
      return
    }
    let cancelled = false
    setLoading(true)
    listMcpTools(serverId).then(data => {
      if (!cancelled) setTools(data)
    }).catch(console.error).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [serverId])

  return { tools, loading }
}
