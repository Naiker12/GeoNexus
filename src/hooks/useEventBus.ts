import { useEffect, useRef, useState } from "react"
import { subscribeEvents, listGeoEvents, type GeoEvent, type Artifact } from "@/api/events"

export function useEventBus(sessionId: string) {
  const [events, setEvents] = useState<GeoEvent[]>([])
  const unlistenRef = useRef<() => void>()

  useEffect(() => {
    if (!sessionId) {
      setEvents([])
      return
    }

    // Load initial events from SQLite DB
    listGeoEvents(sessionId).then((existing) => {
      setEvents(existing)
    })

    // Subscribe to new real-time events
    subscribeEvents(sessionId, (event) => {
      setEvents((prev) => {
        // Dedup by event ID to prevent duplicates
        if (prev.some((e) => e.id === event.id)) return prev
        return [...prev, event]
      })
    }).then((unlisten) => {
      unlistenRef.current = unlisten
    })

    return () => {
      unlistenRef.current?.()
    }
  }, [sessionId])

  return events
}

import type { Artifact as IdeArtifact } from "@/features/workspace/ide/ide-types"

function mapApiArtifactToIde(a: any): IdeArtifact {
  return {
    id: a.id,
    name: a.name,
    path: a.path || "",
    type: a.artifact_type as IdeArtifact["type"],
    description: a.metadata?.description || "",
    lineCount: a.metadata?.line_count || 0,
    status: (a.metadata?.status as IdeArtifact["status"]) || "done",
    content: a.content || undefined,
  }
}

export function useArtifactStream(conversationId?: string) {
  const [artifacts, setArtifacts] = useState<IdeArtifact[]>([])
  const [loading, setLoading] = useState(true)
  const unlistenRef = useRef<() => void>()

  useEffect(() => {
    if (!conversationId) {
      setArtifacts([])
      setLoading(false)
      return
    }

    import("@/api/events").then(({ listArtifacts, subscribeEvents }) => {
      listArtifacts(conversationId)
        .then((items) => {
          setArtifacts(items.map(mapApiArtifactToIde))
        })
        .finally(() => setLoading(false))

      subscribeEvents(conversationId, (event) => {
        if (event.event_type === "artifact_created") {
          listArtifacts(conversationId).then((items) => {
            setArtifacts(items.map(mapApiArtifactToIde))
          })
        }
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

