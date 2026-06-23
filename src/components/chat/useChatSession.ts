import * as React from "react"
import type { AiConnector } from "@/types/workspace-types"
import type { ContextToggle } from "@/components/chat/ProjectContextPanel"
import type { Message } from "@/types/chat"
import { useConversation } from "./hooks/useConversation"
import { useWebSearch } from "./hooks/useWebSearch"
import { useChatSubmit } from "./hooks/useChatSubmit"

export function useChatSession(
  activeConnectorId: string | null,
  allConnectors: AiConnector[],
) {
  const {
    messages, setMessages, conversationId, setConversationId,
    loadingHistory, error: convError, setError: setConvError,
    loadConversation, newConversation: newConv,
    updateAssistantMessage, addSystemMessage,
  } = useConversation()

  const {
    webSearchEnabled, setWebSearchEnabled,
    sessionSummary, setSessionSummary,
    lastIntent, setLastIntent,
    stopResearchTimer, startResearchTimer,
  } = useWebSearch()

  const [contextToggles, setContextToggles] = React.useState<ContextToggle>({
    rag_chunks: true,
    indexed_assets: true,
    graph_nodes: true,
  })

  const {
    activeProvider, pending, loadingPhase, error: submitError, setError: setSubmitError,
    submit, regenerate, stop,
  } = useChatSubmit(
    conversationId, setConversationId,
    setMessages, updateAssistantMessage,
    webSearchEnabled, contextToggles,
    activeConnectorId, allConnectors,
    stopResearchTimer, startResearchTimer,
    setSessionSummary, setLastIntent,
  )

  const error = convError || submitError
  const setError = React.useCallback((e: string | null) => {
    setConvError(e)
    setSubmitError(e)
  }, [setConvError, setSubmitError])

  const newConversation = React.useCallback(() => {
    stop()
    newConv()
  }, [stop, newConv])

  const [submitTime, setSubmitTime] = React.useState<number | null>(null)

  React.useEffect(() => {
    setSubmitTime(Date.now())
  }, [pending])

  const wrappedSubmit = React.useCallback(
    (content: string, mentions?: { assetIds: string[]; connectorIds: string[]; mcpServerIds?: string[]; nodeIds: string[]; agentSources?: string[] }, skillNames?: string[], attachments?: Message["attachments"], reasoning_effort?: string) => {
      setSubmitTime(Date.now())
      return submit(content, mentions, skillNames, attachments, reasoning_effort)
    },
    [submit],
  )

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
    lastIntent,
    submit: wrappedSubmit,
    regenerate,
    loadConversation,
    newConversation,
    stop,
    addSystemMessage,
  }
}
