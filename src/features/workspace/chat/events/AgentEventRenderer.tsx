import { useEffect, useState, useCallback } from "react"
import { AgentCard } from "@/features/workspace/agents/AgentCard"
import type { AgentEvent } from "@/types/agents"

export function AgentEventRenderer() {
  const [events, setEvents] = useState<AgentEvent[]>([])

  const handleEvent = useCallback((event: AgentEvent) => {
    setEvents((prev) => [...prev, event])
  }, [])

  useEffect(() => {
    const isTauri =
      typeof window !== "undefined" &&
      (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ !== undefined

    if (!isTauri) return

    let unlisten: (() => void) | null = null

    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<AgentEvent>("agent:event", ({ payload }) => {
        handleEvent(payload)
      }).then((fn) => {
        unlisten = fn
      })
    })

    return () => {
      unlisten?.()
    }
  }, [handleEvent])

  if (events.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 py-1">
      {events.map((evt, i) => (
        <AgentCard key={i} event={evt} compact />
      ))}
    </div>
  )
}
