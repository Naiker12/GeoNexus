import { useState, useEffect, useCallback } from "react"
import { listMcpTools } from "@/api/mcp"
import type { McpTool } from "@/types/mcp"

export function useMcpTools(serverId: string | null) {
  const [tools, setTools] = useState<McpTool[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!serverId) {
      setTools([])
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    listMcpTools(serverId).then(data => {
      if (!cancelled) setTools(data)
    }).catch((err) => {
      if (!cancelled) setError(String(err))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [serverId, refreshKey])

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  return { tools, loading, error, refresh }
}
