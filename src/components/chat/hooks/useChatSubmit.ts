import { sendMessage } from "@/api/chat"
import type { ContextToggle } from "@/components/chat/ProjectContextPanel"
import { useToast } from "@/components/ui/toast"
import type { FileAttachment, KnowledgeLookupStep, Message, SendMessageInput } from "@/types/chat"
import type { AiConnector } from "@/types/workspace-types"
import * as React from "react"
type ChatLoadingPhase = "idle" | "classifying" | "searching" | "generating" | "extracting" | "done"

const DEFAULT_PROJECT_ID = "project-default"

function needsLiveData(text: string): boolean {
  const t = text.toLowerCase()
  const liveSignals = [
    /\bhoy\b/,
    /\bahora\b/,
    /\ben vivo\b/,
    /\bactual(mente)?\b/,
    /\bresultado(s)?\b/,
    /\bganó\b|\bgano\b|\bganador\b/,
    /\bnoticias?\b/,
    /\bprecio\b|\bcotización\b/,
    /\b20(2[5-9]|[3-9]\d)\b/, // años 2025+ mencionados explícitamente
  ]
  return liveSignals.some((re) => re.test(t))
}

export function useChatSubmit(
  conversationId: string | null,
  setConversationId: (id: string | null) => void,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  updateAssistantMessage: (
    id: string,
    updates: Partial<Message> | ((prev: Message) => Partial<Message>)
  ) => void,
  webSearchEnabled: boolean,
  contextToggles: ContextToggle,
  activeConnectorId: string | null,
  allConnectors: AiConnector[],
  stopResearchTimer: () => void,
  startResearchTimer: (
    startTime: number,
    assistantMsgId: string,
    onTick: (elapsed: number) => void
  ) => void,
  setSessionSummary: (s: any) => void,
  setLastIntent: (s: string | null) => void
) {
  const { toast } = useToast()
  const [pending, setPending] = React.useState(false)
  const [loadingPhase, setLoadingPhase] = React.useState<ChatLoadingPhase>("idle")
  const [error, setError] = React.useState<string | null>(null)
  const submitTimeRef = React.useRef<number>(0)
  const generationRef = React.useRef(0)
  const _pendingConversationRef = React.useRef<string | null>(null)

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

  const submit = React.useCallback(
    async (
      content: string,
      mentions?: {
        assetIds: string[]
        connectorIds: string[]
        mcpServerIds?: string[]
        nodeIds: string[]
        agentSources?: string[]
      },
      skillNames?: string[],
      attachments?: FileAttachment[],
      reasoning_effort?: string
    ) => {
      const clean = content.trim()
      if (!clean || pending) return
      if (!activeProvider) {
        setError("No hay proveedor LLM configurado")
        toast({
          title: "Sin proveedor",
          description: "Conecta un proveedor LLM en Contenedores IA para usar el chat",
          variant: "warning",
        })
        return
      }

      submitTimeRef.current = Date.now()
      const myGen = generationRef.current

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
        attachments,
      }

      setError(null)
      setPending(true)
      setLoadingPhase("classifying")
      setMessages((current) => [...current, optimistic])

      const assistantMsgId = `assistant-${Date.now()}`
      const startTime = Date.now()

      const useContext =
        contextToggles.rag_chunks || contextToggles.indexed_assets || contextToggles.graph_nodes

      const active = allConnectors.find((c) => c.id === activeConnectorId)

      const autoWebSearch = webSearchEnabled || needsLiveData(clean)

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
        ...(autoWebSearch
          ? {
              isSearching: true,
              currentSearchQuery: "Buscando fuentes...",
              research_sources: [],
              searchElapsedSeconds: 0,
            }
          : {}),
      }
      setMessages((current) => [...current, placeholderAssistant])

      const searchingTimer = setTimeout(() => setLoadingPhase("searching"), 300)

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
        web_search: autoWebSearch || undefined,
        mentioned_asset_ids: mentions?.assetIds.length ? mentions.assetIds : undefined,
        mentioned_connector_ids: mentions?.connectorIds.length ? mentions.connectorIds : undefined,
        mentioned_mcp_server_ids: mentions?.mcpServerIds?.length
          ? mentions.mcpServerIds
          : undefined,
        mentioned_node_ids: mentions?.nodeIds.length ? mentions.nodeIds : undefined,
        mentioned_agent_sources: mentions?.agentSources?.length ? mentions.agentSources : undefined,
        skill_names: skillNames && skillNames.length > 0 ? skillNames : undefined,
        attachments,
        reasoning_effort: reasoning_effort || undefined,
      }

      if (autoWebSearch) {
        startResearchTimer(startTime, assistantMsgId, (elapsed: number) => {
          updateAssistantMessage(assistantMsgId, {
            searchElapsedSeconds: elapsed,
            currentSearchQuery:
              elapsed < 2
                ? "Buscando fuentes..."
                : elapsed < 4
                  ? "Analizando resultados..."
                  : "Generando respuesta...",
          })
        })
      }

      let unlisten: (() => void) | null = null
      let tokenBuffer = ""
      let flushTimer: number | null = null
      const flushTokenBuffer = () => {
        if (!tokenBuffer) {
          flushTimer = null
          return
        }
        const chunk = tokenBuffer
        tokenBuffer = ""
        flushTimer = null
        setMessages((current) =>
          current.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: msg.content + chunk } : msg
          )
        )
      }

      try {
        const { listen } = await import("@tauri-apps/api/event")
        unlisten = await listen<string>("llm:token", ({ payload }) => {
          tokenBuffer += payload ?? ""
          if (flushTimer == null) {
            flushTimer = window.setTimeout(flushTokenBuffer, 50)
          }
        })

        clearTimeout(searchingTimer)
        setLoadingPhase("generating")

        const response = await sendMessage(input)
        if (generationRef.current !== myGen) {
          unlisten?.()
          if (flushTimer != null) {
            window.clearTimeout(flushTimer)
            flushTimer = null
          }
          setPending(false)
          setLoadingPhase("idle")
          return
        }
        unlisten?.()
        if (flushTimer != null) {
          window.clearTimeout(flushTimer)
          flushTimer = null
        }
        flushTokenBuffer()
        setConversationId(response.conversation_id)
        setLoadingPhase("extracting")
        if (response.session_summary) setSessionSummary(response.session_summary)
        if (response.intent) setLastIntent(response.intent)

        stopResearchTimer()

        const elapsed = (Date.now() - startTime) / 1000
        const uniqueAssetsCount = new Set(
          response.chunks_used?.map((c) => c.asset_id).filter(Boolean) ?? []
        ).size
        const finalKnowledgeSteps: KnowledgeLookupStep[] | undefined = useContext
          ? [
              {
                source: "chromadb",
                label: "Búsqueda semántica",
                status: (response.chunks_used?.length ?? 0) > 0 ? "found" : "empty",
                count: response.chunks_used?.length ?? 0,
              },
              {
                source: "graph",
                label: "Knowledge Graph",
                status: (response.message.nodes_used?.length ?? 0) > 0 ? "found" : "empty",
                count: response.message.nodes_used?.length ?? 0,
              },
              {
                source: "assets",
                label: "Assets indexados",
                status: uniqueAssetsCount > 0 ? "found" : "empty",
                count: uniqueAssetsCount,
              },
            ]
          : undefined

        const baseUpdate: Record<string, unknown> = {
          conversation_id: response.conversation_id,
          content: response.message.content,
          stats: response.message.stats,
          knowledgeSteps: finalKnowledgeSteps,
          chunk_references: response.chunks_used,
        }
        if (autoWebSearch) {
          updateAssistantMessage(assistantMsgId, {
            ...baseUpdate,
            content: response.message.content,
            isSearching: false,
            currentSearchQuery: response.search_query ?? clean,
            research_sources: response.research_sources ?? [],
            searchElapsedSeconds: elapsed,
          } as Partial<Message>)
        } else {
          updateAssistantMessage(assistantMsgId, baseUpdate as Partial<Message>)
        }

        toast({
          title: "Respuesta recibida",
          description: "Geo Agents ha completado el análisis",
          variant: "success",
        })
      } catch (err) {
        if (flushTimer != null) {
          window.clearTimeout(flushTimer)
          flushTimer = null
        }
        clearTimeout(searchingTimer)
        stopResearchTimer()

        // Mantener el mensaje del usuario y solo limpiar el mensaje incompleto del asistente
        setMessages((current) => current.filter((m) => m.id !== assistantMsgId))

        const rawMsg =
          typeof err === "string" ? err : err instanceof Error ? err.message : String(err)

        let friendlyError = rawMsg
        const lower = rawMsg.toLowerCase()
        if (
          lower.includes("failed to fetch") ||
          lower.includes("econnrefused") ||
          lower.includes("network error") ||
          lower.includes("connection refused")
        ) {
          friendlyError =
            "No se pudo conectar con el servidor LLM / Ollama. Asegúrate de que Ollama o tu contenedor local esté en ejecución."
        } else if (
          lower.includes("not found") ||
          lower.includes("model not found") ||
          lower.includes("404")
        ) {
          friendlyError = `El modelo '${activeProvider.model}' no fue encontrado en el proveedor. Verifica que esté descargado en el Hub de Modelos.`
        } else if (lower.includes("context length") || lower.includes("maximum context")) {
          friendlyError =
            "El tamaño de la conversación supera el límite de contexto del modelo. Por favor inicia un nuevo chat."
        } else if (
          lower.includes("unauthorized") ||
          lower.includes("401") ||
          lower.includes("invalid api key")
        ) {
          friendlyError =
            "Clave de API inválida o expirada. Revisa la configuración en Contenedores IA."
        }

        setError(friendlyError)
      } finally {
        setPending(false)
        setLoadingPhase("idle")
      }
    },
    [
      activeProvider,
      activeConnectorId,
      allConnectors,
      conversationId,
      pending,
      webSearchEnabled,
      contextToggles,
      updateAssistantMessage,
      stopResearchTimer,
      startResearchTimer,
      setConversationId,
      setMessages,
      setSessionSummary,
      setLastIntent,
      toast,
    ]
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

    if (contentToSubmit) submit(contentToSubmit)
  }, [submit])

  const stop = React.useCallback(() => {
    generationRef.current += 1
    stopResearchTimer()
    setPending(false)
    setLoadingPhase("idle")
  }, [stopResearchTimer])

  return {
    activeProvider,
    pending,
    loadingPhase,
    error,
    setError,
    submit,
    regenerate,
    stop,
    submitTimeRef,
  }
}
