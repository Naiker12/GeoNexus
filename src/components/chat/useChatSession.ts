import * as React from "react"

import { listMessages, sendMessage } from "@/api/chat"
import { useToast } from "@/components/ui/toast"
import type { AiConnector } from "@/features/workspace/workspace-data"
import type { ContextToggle } from "@/components/chat/ProjectContextPanel"
import type { Message, SendMessageInput, KnowledgeLookupStep, SessionSummary } from "@/types/chat"
import type { ChatLoadingPhase } from "@/components/chat/ChatLoadingIndicator"

const DEFAULT_PROJECT_ID = "project-default"
const DEFAULT_TOGGLES: ContextToggle = {
  rag_chunks: true,
  indexed_assets: true,
  graph_nodes: true,
}
const CONVERSATION_ID_KEY = "geonexus.activeConversationId"
const WEB_SEARCH_KEY = "geonexus.webSearchEnabled"

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

function loadWebSearchEnabled(): boolean {
  try {
    const stored = localStorage.getItem(WEB_SEARCH_KEY)
    return stored === "true"
  } catch {
    return false
  }
}

function saveWebSearchEnabled(enabled: boolean) {
  try {
    localStorage.setItem(WEB_SEARCH_KEY, enabled ? "true" : "false")
  } catch {
    // localStorage may be full or unavailable
  }
}

let researchTimerId: ReturnType<typeof setInterval> | null = null

export function useChatSession(
  activeConnectorId: string | null,
  allConnectors: AiConnector[]
) {
  const { toast } = useToast()
  const [messages, setMessages] = React.useState<Message[]>([])
  const [conversationId, setConversationId] = React.useState<string | null>(
    null
  )
  const [pending, setPending] = React.useState(false)
  const [loadingPhase, setLoadingPhase] = React.useState<ChatLoadingPhase>("idle")
  const [error, setError] = React.useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = React.useState(false)
  const [contextToggles, setContextToggles] =
    React.useState<ContextToggle>(DEFAULT_TOGGLES)
  const [webSearchEnabled, setWebSearchEnabled] = React.useState<boolean>(
    () => loadWebSearchEnabled()
  )
  const [submitTime, setSubmitTime] = React.useState<number | null>(null)
  const [sessionSummary, setSessionSummary] = React.useState<SessionSummary | null>(null)

  React.useEffect(() => {
    saveConversationId(conversationId)
  }, [conversationId])

  React.useEffect(() => {
    saveConversationId(null)
  }, [])

  React.useEffect(() => {
    saveWebSearchEnabled(webSearchEnabled)
  }, [webSearchEnabled])

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
      saveConversationId(id)
    } catch (err) {
      setError('No se pudo cargar la conversación')
    } finally {
      setLoadingHistory(false)
    }
  }, [])



  const newConversation = React.useCallback(() => {
    if (researchTimerId) {
      clearInterval(researchTimerId)
      researchTimerId = null
    }
    setMessages([])
    setConversationId(null)
    saveConversationId(null)
    setError(null)
    setSessionSummary(null)
  }, [])

  const updateAssistantMessage = React.useCallback((
    id: string,
    updates: Partial<Message> | ((prev: Message) => Partial<Message>)
  ) => {
    setMessages((current) =>
      current.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              ...(typeof updates === "function" ? updates(msg) : updates),
            }
          : msg
      )
    )
  }, [])

  const submit = React.useCallback(
    async (content: string, mentions?: { assetIds: string[]; connectorIds: string[]; nodeIds: string[]; agentSources?: string[] }, skillNames?: string[]) => {
      const clean = content.trim()
      if (!clean || pending) return
      if (!activeProvider) {
        setError("No hay proveedor LLM configurado")
        toast({ title: "Sin proveedor", description: "Conecta un proveedor LLM en Contenedores IA para usar el chat", variant: "warning" })
        return
      }

      setSubmitTime(Date.now())

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
      setLoadingPhase("classifying")
      setMessages((current) => [...current, optimistic])

      const assistantMsgId = `assistant-${Date.now()}`
      const startTime = Date.now()

      const placeholderAssistant: Message = {
        id: assistantMsgId,
        conversation_id: conversationId ?? "pending",
        role: "assistant",
        content: "",
        provider: activeProvider.provider,
        model: activeProvider.model,
        trace_id: "",
        chunks_used: [],
        nodes_used: [],
        tool_calls: [],
        sources: [],
        created_at: Math.floor(Date.now() / 1000),
        ...(webSearchEnabled ? {
          isSearching: true,
          currentSearchQuery: "Buscando fuentes...",
          research_sources: [],
          searchElapsedSeconds: 0,
        } : {}),
      }
      setMessages((current) => [...current, placeholderAssistant])

      const searchingTimer = setTimeout(() => setLoadingPhase("searching"), 300)

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
        web_search: webSearchEnabled || undefined,
        mentioned_asset_ids: mentions?.assetIds.length ? mentions.assetIds : undefined,
        mentioned_connector_ids: mentions?.connectorIds.length ? mentions.connectorIds : undefined,
        mentioned_node_ids: mentions?.nodeIds.length ? mentions.nodeIds : undefined,
        mentioned_agent_sources: mentions?.agentSources?.length ? mentions.agentSources : undefined,
        skill_names: skillNames && skillNames.length > 0 ? skillNames : undefined,
      }

      if (webSearchEnabled) {
        researchTimerId = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000
          updateAssistantMessage(assistantMsgId, {
            searchElapsedSeconds: elapsed,
            currentSearchQuery: elapsed < 2
              ? "Buscando fuentes..."
              : elapsed < 4 ? "Analizando resultados..." : "Generando respuesta...",
          })
        }, 500)
      }

      let unlisten: (() => void) | null = null

      try {
        const { listen } = await import("@tauri-apps/api/event")
        unlisten = await listen<string>("llm:token", ({ payload }) => {
          setMessages((current) =>
            current.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: msg.content + payload }
                : msg
            )
          )
        })

        clearTimeout(searchingTimer)
        setLoadingPhase("generating")

        const response = await sendMessage(input)
        unlisten?.()
        console.log("[DEBUG] sendMessage response.research_sources:", response.research_sources)
        setConversationId(response.conversation_id)
        saveConversationId(response.conversation_id)
        setLoadingPhase("extracting")
        if (response.session_summary) {
          setSessionSummary(response.session_summary)
        }

        if (researchTimerId) {
          clearInterval(researchTimerId)
          researchTimerId = null
        }

        const elapsed = (Date.now() - startTime) / 1000

        const uniqueAssetsCount = new Set(response.chunks_used?.map(c => c.asset_id).filter(Boolean) ?? []).size
        const finalKnowledgeSteps: KnowledgeLookupStep[] | undefined = useContext ? [
          { source: "chromadb", label: "Búsqueda semántica", status: (response.chunks_used?.length ?? 0) > 0 ? "found" : "empty", count: response.chunks_used?.length ?? 0 },
          { source: "graph", label: "Knowledge Graph", status: (response.message.nodes_used?.length ?? 0) > 0 ? "found" : "empty", count: response.message.nodes_used?.length ?? 0 },
          { source: "assets", label: "Assets indexados", status: uniqueAssetsCount > 0 ? "found" : "empty", count: uniqueAssetsCount },
        ] : undefined

        const baseUpdate: Record<string, unknown> = {
          conversation_id: response.conversation_id,
          stats: response.message.stats,
          knowledgeSteps: finalKnowledgeSteps,
          chunk_references: response.chunks_used,
        }
        if (webSearchEnabled) {
          updateAssistantMessage(assistantMsgId, {
            ...baseUpdate,
            content: response.message.content,
            isSearching: false,
            currentSearchQuery: response.search_query ?? clean,
            research_sources: (response.research_sources ?? []),
            searchElapsedSeconds: elapsed,
          } as Partial<Message>)
        } else {
          updateAssistantMessage(assistantMsgId, baseUpdate as Partial<Message>)
        }

        toast({ title: "Respuesta recibida", description: "Geo Agents ha completado el analisis", variant: "success" })
      } catch (err) {
        clearTimeout(searchingTimer)

        if (researchTimerId) {
          clearInterval(researchTimerId)
          researchTimerId = null
        }

        setMessages((current) =>
          current.filter((m) => m.id !== optimistic.id && m.id !== assistantMsgId)
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
        setLoadingPhase("idle")
      }
    },
    [activeProvider, activeConnectorId, allConnectors, conversationId, pending, webSearchEnabled, contextToggles, updateAssistantMessage]
  )

  const regenerate = React.useCallback(() => {
    setError(null)
    let contentToSubmit = ""

    setMessages((current) => {
      let lastUserIdx = -1
      for (let i = current.length - 1; i >= 0; i--) {
        if (current[i].role === "user") {
          lastUserIdx = i
          contentToSubmit = current[i].content
          break
        }
      }
      if (lastUserIdx === -1) return current
      return current.slice(0, lastUserIdx)
    })

    if (contentToSubmit) {
      submit(contentToSubmit)
    }
  }, [submit])

  return {
    activeProvider,
    conversationId,
    error,
    messages,
    pending,
    loadingPhase,
    loadingHistory,
    contextToggles,
    setContextToggles,
    webSearchEnabled,
    setWebSearchEnabled,
    submitTime,
    sessionSummary,
    submit,
    regenerate,
    loadConversation,
    newConversation,
  }
}
