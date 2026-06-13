import { useState } from "react"
import type { DiscoveredAsset, AgentEvent } from "@/types/agents"

export function useDiscoveryAgent() {
  const [assets, setAssets] = useState<DiscoveredAsset[]>([])
  const [loading, setLoading] = useState(false)

  const discoverAssets = async (events: AgentEvent[]) => {
    setLoading(true)
    const discoveryEvent = events.find((e) => e.agent === "discovery" && e.status === "done")
    if (discoveryEvent?.data) {
      setAssets(discoveryEvent.data as DiscoveredAsset[])
    }
    setLoading(false)
  }

  return { assets, loading, discoverAssets }
}
