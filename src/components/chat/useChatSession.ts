import * as React from "react"
import type { AiConnector } from "@/types/workspace-types"
import type { ContextToggle } from "@/components/chat/ProjectContextPanel"
import type { ChatLoadingPhase } from "@/components/chat/ChatLoadingIndicator"
import type { Message } from "@/types/chat"
import { useConversation } from "./hooks/useConversation"
import { useWebSearch } from "./hooks/useWebSearch"
import { useChatPipeline } from "./hooks/useChatPipeline"
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

  const {
    pipeline,
    resetPipeline, markPipelineComplete,
  } = useChatPipeline()

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
    resetPipeline, markPipelineComplete,
    stopResearchTimer, startResearchTimer,
    setSessionSummary, setLastIntent,
  )

  const error = convError || submitError
  const setError = React.useCallback((e: string | null) => {
    setConvError(e)
    setSubmitError(e)
  }, [setConvError, setSubmitError])

  const newConversation = React.useCallback(() => {
    newConv()
    resetPipeline()
  }, [newConv, resetPipeline])

  const [submitTime, setSubmitTime] = React.useState<number | null>(null)

  React.useEffect(() => {
    setSubmitTime(Date.now())
  }, [pending])

  const wrappedSubmit = React.useCallback(
    (content: string, mentions?: { assetIds: string[]; connectorIds: string[]; nodeIds: string[]; agentSources?: string[] }, skillNames?: string[], attachments?: Message["attachments"]) => {
      setSubmitTime(Date.now())
      return submit(content, mentions, skillNames, attachments)
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
    pipeline,
    submit: wrappedSubmit,
    regenerate,
    loadConversation,
    newConversation,
    stop,
    addSystemMessage,
  }
}
