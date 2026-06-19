import { useEffect, useRef, useState, useCallback } from "react"
import { subscribeToAllBusEvents, type BusEvent, type Artifact } from "@/api/events"

export function useEventBus() {
  const [latestEvent, setLatestEvent] = useState<BusEvent | null>(null)
  const [events, setEvents] = useState<BusEvent[]>([])
  const unlistenRef = useRef<() => void>()

  useEffect(() => {
    subscribeToAllBusEvents((event) => {
      setLatestEvent(event)
      setEvents(prev => [event, ...prev].slice(0, 200))
    }).then((unlisten) => {
      unlistenRef.current = unlisten
    })
    return () => {
      unlistenRef.current?.()
    }
  }, [])

  const clearEvents = useCallback(() => {
    setEvents([])
    setLatestEvent(null)
  }, [])

  return { latestEvent, events, clearEvents }
}

export function useArtifactStream(conversationId?: string) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)
  const unlistenRef = useRef<() => void>()

  useEffect(() => {
    import("@/api/events").then(({ listArtifacts, subscribeToAllBusEvents }) => {
      listArtifacts(conversationId).then(setArtifacts).finally(() => setLoading(false))

      subscribeToAllBusEvents((event) => {
        if (event.domain !== "artifact") return
        setArtifacts(prev => {
          if (event.action === "created" || event.action === "updated") {
            const payload = event.payload as any
            const idx = prev.findIndex(a => a.id === payload.id)
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = { ...next[idx], ...payload }
              return next
            }
            return [{ ...payload } as Artifact, ...prev]
          }
          if (event.action === "deleted") {
            return prev.filter(a => a.id !== (event.payload as any).id)
          }
          return prev
        })
      }).then((unlisten) => {
        unlistenRef.current = unlisten
      })
    })
    return () => {
      unlistenRef.current?.()
    }
  }, [conversationId])

  return { artifacts, loading }
}
