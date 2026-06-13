import { useState, useEffect, useCallback } from "react"
import { listMcpServers, registerMcpServer, pingMcpServer } from "@/api/mcp"
import type { McpServer, RegisterServerPayload, PingResult } from "@/types/mcp"

export function useMcpServers() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listMcpServers()
      setServers(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServers()
  }, [fetchServers])

  const register = useCallback(async (payload: RegisterServerPayload) => {
    const server = await registerMcpServer(payload)
    setServers(prev => {
      const idx = prev.findIndex(s => s.id === server.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = server
        return next
      }
      return [...prev, server]
    })
    return server
  }, [])

  const ping = useCallback(async (serverId: string): Promise<PingResult> => {
    const result = await pingMcpServer(serverId)
    await fetchServers()
    return result
  }, [fetchServers])

  const onlineCount = servers.filter(s => s.status === "online").length

  return { servers, loading, error, onlineCount, register, ping, refresh: fetchServers }
}
