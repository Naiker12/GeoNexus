import { useState, useCallback } from "react"
import { recallChunks } from "@/api/agents"
import type { KnowledgeChunk } from "@/types/agents"

export function useKnowledgeAgent(projectId = "project-default") {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryKnowledge = useCallback(async (query: string, topK = 6) => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const results = await recallChunks(projectId, query, topK)
      setChunks(
        results.map((r) => ({
          id: r.asset_id,
          assetId: r.asset_id,
          content: r.text,
          metadata: { source: r.source },
        }))
      )
    } catch (err) {
      setError(String(err))
      setChunks([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const reset = useCallback(() => {
    setChunks([])
    setError(null)
    setLoading(false)
  }, [])

  return { chunks, loading, error, queryKnowledge, reset }
}