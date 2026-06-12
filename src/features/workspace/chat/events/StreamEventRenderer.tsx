import { useEffect, useState, useCallback } from "react"
import { DeepResearchCard } from "./DeepResearchCard"
import { GeneratingCard } from "./GeneratingCard"
import { ToolCallCard } from "./ToolCallCard"
import { KnowledgeLookupCard } from "./KnowledgeLookupCard"
import { clearPreviewStore } from "../hooks/useStreamPreview"
import type { AnyStreamEvent } from "@/types/chat"

export function StreamEventRenderer() {
  const [events, setEvents] = useState<AnyStreamEvent[]>([])

  const handleEvent = useCallback((event: AnyStreamEvent) => {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.event_id === event.event_id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = event
        return next
      }
      return [...prev, event]
    })
  }, [])

  useEffect(() => {
    const isTauri =
      typeof window !== "undefined" &&
      (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ !== undefined

    if (!isTauri) return

    let unlisten: (() => void) | null = null

    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<AnyStreamEvent>("chat:stream_event", ({ payload }) => {
        handleEvent(payload)
      }).then((fn) => {
        unlisten = fn
      })
    })

    return () => {
      unlisten?.()
      clearPreviewStore()
      setEvents([])
    }
  }, [handleEvent])

  if (events.length === 0) return null

  return (
    <div className="flex flex-col gap-2 py-1">
      {events.map((ev) => {
        switch (ev.type) {
          case "deep_research":
            return <DeepResearchCard key={ev.event_id} event={ev} />
          case "generating":
            return <GeneratingCard key={ev.event_id} event={ev} />
          case "tool_call":
            return <ToolCallCard key={ev.event_id} event={ev} />
          case "knowledge_lookup":
            return <KnowledgeLookupCard key={ev.event_id} event={ev} />
          default:
            return null
        }
      })}
    </div>
  )
}
