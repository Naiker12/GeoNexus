import { useEffect, useRef } from "react"
import { useDraftsStore } from "@/stores/draftsStore"

export function useDraftSync(
  conversationId: string | undefined,
  value: string,
  onValueChange: (value: string) => void,
) {
  const prevConversationId = useRef(conversationId)
  const draftsStore = useDraftsStore()

  useEffect(() => {
    if (conversationId && conversationId !== prevConversationId.current) {
      if (prevConversationId.current) {
        draftsStore.setDraft(prevConversationId.current, value)
      }
      const draft = draftsStore.getDraft(conversationId)
      if (draft && draft !== value) {
        onValueChange(draft)
      }
      prevConversationId.current = conversationId
    }
  }, [conversationId])

  useEffect(() => {
    if (conversationId) {
      const timer = setTimeout(() => {
        draftsStore.setDraft(conversationId, value)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [value, conversationId])
}
