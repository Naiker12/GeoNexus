import * as React from "react"
import { listMessages } from "@/api/chat"
import type { Message } from "@/types/chat"

const CONVERSATION_ID_KEY = "geonexus.activeConversationId"

function loadConversationId(): string | null {
  try { return localStorage.getItem(CONVERSATION_ID_KEY) } catch { return null }
}

function saveConversationId(id: string | null) {
  try {
    if (id) localStorage.setItem(CONVERSATION_ID_KEY, id)
    else localStorage.removeItem(CONVERSATION_ID_KEY)
  } catch { }
}

export function useConversation() {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [conversationId, setConversationId] = React.useState<string | null>(() => loadConversationId())
  const [loadingHistory, setLoadingHistory] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    saveConversationId(conversationId)
    window.dispatchEvent(new CustomEvent("geonexus:conversation-changed", { detail: conversationId }))
  }, [conversationId])

  React.useEffect(() => {
    const handleChanged = (e: Event) => {
      const id = (e as CustomEvent).detail
      if (id !== conversationId) {
        setConversationId(id)
        if (id) {
          listMessages(id).then(setMessages).catch(() => setError("No se pudo cargar la conversación"))
        } else {
          setMessages([])
        }
      }
    }
    window.addEventListener("geonexus:conversation-changed", handleChanged)
    return () => window.removeEventListener("geonexus:conversation-changed", handleChanged)
  }, [conversationId])

  const loadConversation = React.useCallback(async (id: string) => {
    setLoadingHistory(true)
    setError(null)
    try {
      const msgs = await listMessages(id)
      setMessages(msgs)
      setConversationId(id)
    } catch {
      setError("No se pudo cargar la conversación")
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  const newConversation = React.useCallback(() => {
    setMessages([])
    setConversationId(null)
    setError(null)
  }, [])

  const updateAssistantMessage = React.useCallback((
    id: string,
    updates: Partial<Message> | ((prev: Message) => Partial<Message>),
  ) => {
    setMessages((current) =>
      current.map((msg) =>
        msg.id === id
          ? { ...msg, ...(typeof updates === "function" ? updates(msg) : updates) }
          : msg,
      ),
    )
  }, [])

  const addSystemMessage = React.useCallback((content: string) => {
    const msg: Message = {
      id: `sys-${Date.now()}`,
      conversation_id: conversationId ?? "",
      role: "system",
      content,
      provider: null,
      model: null,
      created_at: Date.now(),
      trace_id: "",
      chunks_used: [],
      nodes_used: [],
      tool_calls: [],
      sources: [],
    }
    setMessages((prev) => [...prev, msg])
  }, [conversationId])

  return {
    messages,
    setMessages,
    conversationId,
    setConversationId,
    loadingHistory,
    error,
    setError,
    loadConversation,
    newConversation,
    updateAssistantMessage,
    addSystemMessage,
  }
}
