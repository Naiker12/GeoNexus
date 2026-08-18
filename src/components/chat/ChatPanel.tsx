import { Thread } from "@/components/assistant-ui/thread"
import { useChatSession } from "@/components/chat/useChatSession"
import { useToast } from "@/components/ui/toast"
import { useConnectors } from "@/contexts/ConnectorsContext"
import { AgentTaskPanel } from "@/features/agent/components/AgentTaskPanel"
import { useAgentTaskStore } from "@/features/agent/store/useAgentTaskStore"
import {
  handleAsyncSlashCommand,
  handleSlashCommand,
} from "@/features/workspace/commands/slash-commands"
import type { FileAttachment } from "@/types/chat"
import type { AiConnector } from "@/types/workspace-types"
import * as React from "react"

type ChatPanelProps = {
  models?: AiConnector[]
}

export function ChatPanel(_props: ChatPanelProps) {
  const { toast } = useToast()
  const { connectors, activeConnectorId } = useConnectors()
  const agentStoreMode = useAgentTaskStore((s) => s.mode)
  const {
    conversationId,
    error,
    messages,
    pending,
    webSearchEnabled,
    setWebSearchEnabled,
    submit,
    regenerate,
    loadConversation,
    newConversation,
    stop,
    addSystemMessage,
  } = useChatSession(activeConnectorId, connectors)

  const [reasoningEffort, setReasoningEffort] = React.useState<
    "none" | "minimal" | "medium" | "high" | "max"
  >("none")

  // Listen to external triggers from AppSidebar
  React.useEffect(() => {
    const handleNew = () => newConversation()
    const handleLoad = (e: Event) => {
      const convId = (e as CustomEvent).detail?.id
      if (convId) loadConversation(convId)
    }

    window.addEventListener("geonexus:new-chat", handleNew)
    window.addEventListener("geonexus:load-chat", handleLoad)
    return () => {
      window.removeEventListener("geonexus:new-chat", handleNew)
      window.removeEventListener("geonexus:load-chat", handleLoad)
    }
  }, [newConversation, loadConversation])

  // Notify AppSidebar when conversation updates
  React.useEffect(() => {
    if (conversationId) {
      window.dispatchEvent(new CustomEvent("geonexus:conversation-updated"))
    }
  }, [conversationId, messages.length])

  return (
    <section className="relative flex h-[calc(100svh-3.5rem)] w-full overflow-hidden bg-background">
      <div className="flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
        <Thread
          messages={messages}
          pending={pending}
          isStreaming={pending}
          error={error}
          webSearchEnabled={webSearchEnabled}
          onToggleWebSearch={() => {
            const next = !webSearchEnabled
            setWebSearchEnabled(next)
            toast({
              title: next ? "Búsqueda web activada" : "Búsqueda web desactivada",
              description: next
                ? "El asistente podrá buscar en internet para responder"
                : "El asistente solo usará información local del proyecto",
              variant: next ? "success" : "info",
            })
          }}
          reasoningEffort={reasoningEffort}
          onReasoningEffortChange={setReasoningEffort}
          onSubmit={async (content: string, mentions?: any, attachments?: FileAttachment[]) => {
            // Slash command interception
            const syncResult = handleSlashCommand(content)
            if (syncResult.handled) {
              if (syncResult.type === "message") {
                addSystemMessage(syncResult.content)
              } else if (syncResult.type === "action") {
                if (syncResult.action === "clear") {
                  newConversation()
                }
              }
              return
            }
            if (content.startsWith("/")) {
              const asyncResult = await handleAsyncSlashCommand(content)
              if (asyncResult.handled) {
                if (asyncResult.type === "message") {
                  addSystemMessage(asyncResult.content)
                }
                return
              }
            }
            if (agentStoreMode === "agent") {
              await useAgentTaskStore.getState().createTask({
                title: content.slice(0, 80),
                notes: content.length > 80 ? content : undefined,
                priority: "normal",
              })
              return
            }
            submit(content, mentions, undefined, attachments, reasoningEffort)
          }}
          onStop={stop}
          onRegenerate={regenerate}
        />
      </div>

      {agentStoreMode === "agent" && <AgentTaskPanel />}
    </section>
  )
}
