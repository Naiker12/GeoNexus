import { useState, useEffect } from "react"
import { listen } from "@tauri-apps/api/event"
import type { ReasoningDelta, ReasoningEnd } from "@/types/reasoning"

export function useReasoningStream(conversationId: string | null) {
  const [text, setText] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [durationMs, setDurationMs] = useState<number | null>(null)

  useEffect(() => {
    setText("")
    setIsStreaming(false)
    setDurationMs(null)

    const unlistenDelta = listen<ReasoningDelta>("reasoning:delta", (e) => {
      if (e.payload.conversation_id !== conversationId) return
      setIsStreaming(true)
      setText((prev) => prev + e.payload.delta)
    })

    const unlistenEnd = listen<ReasoningEnd>("reasoning:end", (e) => {
      if (e.payload.conversation_id !== conversationId) return
      setIsStreaming(false)
      setDurationMs(e.payload.duration_ms)
      setText(e.payload.full_text)
    })

    return () => {
      unlistenDelta.then((f) => f())
      unlistenEnd.then((f) => f())
    }
  }, [conversationId])

  return { text, isStreaming, durationMs }
}
