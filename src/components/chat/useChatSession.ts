import * as React from "react"

import { listMessages, sendMessage } from "@/api/chat"
import { useToast } from "@/components/ui/toast"
import type { AiConnector } from "@/features/workspace/workspace-data"
import type { ContextToggle } from "@/components/chat/ProjectContextPanel"
import type { Message, SendMessageInput } from "@/types/chat"

const DEFAULT_PROJECT_ID = "project-default"
const DEFAULT_TOGGLES: ContextToggle = {
  rag_chunks: true,
  indexed_assets: true,
  graph_nodes: true,
}
const CONVERSATION_ID_KEY = "geonexus.activeConversationId"

function loadConversationId(): string | null {
  try {
    return localStorage.getItem(CONVERSATION_ID_KEY)
  } catch {
    return null
  }
}

function saveConversationId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(CONVERSATION_ID_KEY, id)
    } else {
      localStorage.removeItem(CONVERSATION_ID_KEY)
    }
  } catch {
    // localStorage may be full or unavailable
  }
}

export function useChatSession(
  activeConnectorId: string | null,
  allConnectors: AiConnector[]
) {
  const { toast } = useToast()
  const [messages, setMessages] = React.useState<Message[]>([])
  const [conversationId, setConversationId] = React.useState<string | null>(
    () => loadConversationId()
  )
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = React.useState(false)
  const [contextToggles, setContextToggles] =
    React.useState<ContextToggle>(DEFAULT_TOGGLES)
  const [webSearchEnabled, setWebSearchEnabled] = React.useState(false)

  React.useEffect(() => {
    saveConversationId(conversationId)
  }, [conversationId])

  const activeProvider = React.useMemo(() => {
    if (!activeConnectorId) return null
    const active = allConnectors.find(
      (model) =>
        model.id === activeConnectorId &&
        model.model !== "Sin modelo" &&
        model.endpoint !== "Sin endpoint"
    )
    if (!active) return null

    return {
      provider: active.id,
      model: active.model,
      endpoint: active.endpoint,
    }
  }, [activeConnectorId, allConnectors])

  const loadConversation = React.useCallback(async (id: string) => {
    setLoadingHistory(true)
    setError(null)
    try {
      const msgs = await listMessages(id)
      setMessages(msgs)
      setConversationId(id)
    } catch (err) {
      setError('No se pudo cargar la conversación')
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  React.useEffect(() => {
    const saved = loadConversationId()
    if (saved) {
      loadConversation(saved)
    }
  }, [])

  const newConversation = React.useCallback(() => {
    setMessages([])
    setConversationId(null)
    setError(null)
  }, [])

  const submit = React.useCallback(
    async (content: string) => {
      const clean = content.trim()
      if (!clean || pending) return
      if (!activeProvider) {
        setError("No hay proveedor LLM configurado")
        toast({ title: "Sin proveedor", description: "Conecta un proveedor LLM en Contenedores IA para usar el chat", variant: "warning" })
        return
      }

      const optimistic: Message = {
        id: `local-${Date.now()}`,
        conversation_id: conversationId ?? "pending",
        role: "user",
        content: clean,
        provider: null,
        model: null,
        trace_id: "",
        chunks_used: [],
        nodes_used: [],
        tool_calls: [],
        sources: [],
        created_at: Math.floor(Date.now() / 1000),
      }

      setError(null)
      setPending(true)
      setMessages((current) => [...current, optimistic])

      const useContext = contextToggles.rag_chunks
        || contextToggles.indexed_assets
        || contextToggles.graph_nodes

      const active = allConnectors.find((c) => c.id === activeConnectorId)

      const input: SendMessageInput = {
        project_id: DEFAULT_PROJECT_ID,
        conversation_id: conversationId,
        content: clean,
        provider: activeProvider.provider,
        model: activeProvider.model,
        endpoint: activeProvider.endpoint,
        api_key: active?.apiKey ?? null,
        use_context: useContext,
        max_context_chunks: useContext ? 4 : 0,
      }
      try {
        const response = await sendMessage(input)
        setConversationId(response.conversation_id)

        setMessages((current) => [
          ...current.map((message) =>
            message.id === optimistic.id
              ? { ...message, conversation_id: response.conversation_id }
              : message
          ),
          response.message,
        ])

        toast({ title: "Respuesta recibida", description: "GeoNexus ha completado el analisis", variant: "success" })
      } catch (err) {
        setMessages((current) =>
          current.filter((message) => message.id !== optimistic.id)
        )
        const message = typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : String(err)
        setError(message)
        toast({ title: "Error en el chat", description: message, variant: "error" })
      } finally {
        setPending(false)
      }
    },
    [activeProvider, activeConnectorId, allConnectors, conversationId, pending]
  )

  return {
    activeProvider,
    conversationId,
    error,
    messages,
    pending,
    loadingHistory,
    contextToggles,
    setContextToggles,
    webSearchEnabled,
    setWebSearchEnabled,
    submit,
    loadConversation,
    newConversation,
  }
}
