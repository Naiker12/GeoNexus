import { useEffect, useState } from "react"
import type { PreviewChunk, EventPreviewState } from "@/types/chat"

const previewStore = new Map<string, EventPreviewState>()
const listeners = new Map<string, Set<() => void>>()

function getOrCreate(event_id: string): EventPreviewState {
  if (!previewStore.has(event_id)) {
    previewStore.set(event_id, {
      event_id,
      chunks: [],
      accumulated_text: "",
    })
  }
  return previewStore.get(event_id)!
}

function notify(event_id: string) {
  listeners.get(event_id)?.forEach((fn) => fn())
}

let globalListenerStarted = false

async function startGlobalListener() {
  if (globalListenerStarted) return
  globalListenerStarted = true

  const isTauri =
    typeof window !== "undefined" &&
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ !== undefined

  if (!isTauri) return

  try {
    const { listen } = await import("@tauri-apps/api/event")
    await listen<PreviewChunk>("chat:preview_chunk", ({ payload }) => {
      const state = getOrCreate(payload.event_id)
      state.chunks.push(payload)
      if (payload.chunk_type === "text") {
        state.accumulated_text += payload.content
      }
      previewStore.set(payload.event_id, { ...state })
      notify(payload.event_id)
    })
  } catch {
    // Tauri listener not available (browser or SSR)
  }
}

startGlobalListener()

export function useStreamPreview(event_id: string): EventPreviewState {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!listeners.has(event_id)) {
      listeners.set(event_id, new Set())
    }
    const update = () => forceUpdate((n) => n + 1)
    listeners.get(event_id)!.add(update)
    return () => {
      listeners.get(event_id)?.delete(update)
    }
  }, [event_id])

  return getOrCreate(event_id)
}

export function clearPreviewStore() {
  previewStore.clear()
  listeners.clear()
}
