import * as React from "react"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { listGraphNodes, listGraphEdges, clearEphemeralNodes } from "@/api/data"
import type { GraphNode, GraphEdge, GraphUpdatePayload } from "@/types/data"

interface GraphEventsState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  lastUpdate: GraphUpdatePayload | null
  loading: boolean
  animatingNodeIds: Set<string>
  pulsingEdgeKeys: Set<string>
  refresh: () => Promise<void>
  clearEphemeral: () => Promise<void>
  setNodes: React.Dispatch<React.SetStateAction<GraphNode[]>>
  setEdges: React.Dispatch<React.SetStateAction<GraphEdge[]>>
}

export function useGraphEvents(
  projectId: string = "project-default",
): GraphEventsState {
  const [nodes, setNodes] = React.useState<GraphNode[]>([])
  const [edges, setEdges] = React.useState<GraphEdge[]>([])
  const [lastUpdate, setLastUpdate] = React.useState<GraphUpdatePayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [animatingNodeIds, setAnimatingNodeIds] = React.useState<Set<string>>(new Set())
  const [pulsingEdgeKeys, setPulsingEdgeKeys] = React.useState<Set<string>>(new Set())

  const refresh = React.useCallback(async () => {
    console.log("🔄 [useGraphEvents] Refreshing graph data...")
    try {
      const [newNodes, newEdges] = await Promise.all([
        listGraphNodes(projectId),
        listGraphEdges(projectId),
      ])
      console.log("📊 [useGraphEvents] Got nodes:", newNodes.length, newNodes)
      console.log("🔗 [useGraphEvents] Got edges:", newEdges.length, newEdges)
      setNodes(newNodes)
      setEdges(newEdges)
    } catch (e) {
      console.error("❌ [useGraphEvents] Error refreshing graph data:", e)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const animateNewNodes = React.useCallback((payload: GraphUpdatePayload) => {
    // Collect IDs of new nodes from the payload
    const newIds = new Set(payload.nodes.map(n => n.id))
    const newEdgeKeys = new Set(
      payload.edges.map(e => `${e.source}-${e.target}`)
    )

    setAnimatingNodeIds(newIds)
    setPulsingEdgeKeys(newEdgeKeys)

    // Clear animation flags after animation completes
    setTimeout(() => {
      setAnimatingNodeIds(new Set())
    }, 150 * Math.min(payload.nodes.length + 1, 10) + 500)

    setTimeout(() => {
      setPulsingEdgeKeys(new Set())
    }, 3000)
  }, [])

  const clearEphemeralFn = React.useCallback(async () => {
    const deleted = await clearEphemeralNodes(projectId)
    if (deleted > 0) {
      await refresh()
    }
  }, [projectId, refresh])

  // Initial load
  React.useEffect(() => {
    refresh()
  }, [refresh])

  // Listen for graph:updated events from Rust backend
  React.useEffect(() => {
    let unlisten: UnlistenFn | undefined
    let cancelled = false

    const setup = async () => {
      try {
        unlisten = await listen<GraphUpdatePayload>("graph:updated", (event) => {
          if (cancelled) return
          const payload = event.payload
          setLastUpdate(payload)
          animateNewNodes(payload)
          // Refresh full graph data after a short delay to let DB settle
          setTimeout(() => {
            if (!cancelled) refresh()
          }, 300)
        })
      } catch (e) {
        console.warn("graph:updated listener not available (probably not in Tauri):", e)
      }
    }

    setup()

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [animateNewNodes, refresh])

  return {
    nodes,
    edges,
    lastUpdate,
    loading,
    animatingNodeIds,
    pulsingEdgeKeys,
    refresh,
    clearEphemeral: clearEphemeralFn,
    setNodes,
    setEdges,
  }
}
