import * as React from "react"

import { sendMessage } from "@/api/chat"
import type { AiConnector } from "@/features/workspace/workspace-data"
import type { Message, SendMessageInput } from "@/types/chat"

const DEFAULT_PROJECT_ID = "project-default"
const DEFAULT_PROVIDER = {
  provider: "ollama",
  model: "llama3.1",
  endpoint: "http://localhost:11434",
}

export function useChatSession(models: AiConnector[]) {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [conversationId, setConversationId] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const activeProvider = React.useMemo(() => {
    const configured = models.find(
      (model) => model.model !== "Sin modelo" && model.endpoint !== "Sin endpoint"
    )

    if (!configured) return DEFAULT_PROVIDER

    return {
      provider: configured.id,
      model: configured.model,
      endpoint: configured.endpoint,
    }
  }, [models])

  const submit = React.useCallback(
    async (content: string) => {
      const clean = content.trim()
      if (!clean || pending) return

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
        created_at: Math.floor(Date.now() / 1000),
      }

      setError(null)
      setPending(true)
      setMessages((current) => [...current, optimistic])

      const input: SendMessageInput = {
        project_id: DEFAULT_PROJECT_ID,
        conversation_id: conversationId,
        content: clean,
        provider: activeProvider.provider,
        model: activeProvider.model,
        endpoint: activeProvider.endpoint,
        use_context: false,
        max_context_chunks: 0,
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
      } catch (err) {
        setMessages((current) =>
          current.filter((message) => message.id !== optimistic.id)
        )
        setError(err instanceof Error ? err.message : "No fue posible enviar el mensaje")
      } finally {
        setPending(false)
      }
    },
    [activeProvider, conversationId, pending]
  )

  return {
    activeProvider,
    conversationId,
    error,
    messages,
    pending,
    submit,
  }
}
