import * as React from "react"
import {
  MessageSquarePlusIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "lucide-react"

import { GeoAgentsIcon } from "@/components/brand/GeoAgentsIcon"
import { Button } from "@/components/ui/Button"
import { ConversationSidebarList } from "@/components/chat/ConversationSidebarList"
import { ModelHeaderPopover } from "@/components/chat/ModelHeaderPopover"
import { ChatComposer } from "@/components/chat/ChatComposer"
import { ChatTranscript } from "@/components/chat/ChatTranscript"
import { ProjectContextPanel } from "@/components/chat/ProjectContextPanel"
import { useChatSession } from "@/components/chat/useChatSession"
import { useConnectors } from "@/contexts/ConnectorsContext"
import type { AiConnector } from "@/features/workspace/workspace-data"
import { useToast } from "@/components/ui/toast"

const PROJECT_ID = "project-default"

type ChatPanelProps = {
  models?: AiConnector[]
}

export function ChatPanel(_props: ChatPanelProps) {
  const { toast } = useToast()
  const { connectors, activeConnectorId, setActiveConnectorId } =
    useConnectors()
  const {
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
    submit,
    regenerate,
    loadConversation,
    newConversation,
  } = useChatSession(activeConnectorId, connectors)

  const [sidebarOpen, setSidebarOpen] = React.useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("geonexus.sidebarOpen")
      return stored !== null ? stored === "true" : true
    }
    return true
  })
  const [contextPanelOpen, setContextPanelOpen] = React.useState(false)
  const [sidebarRefreshKey, setSidebarRefreshKey] = React.useState(0)

  React.useEffect(() => {
    localStorage.setItem("geonexus.sidebarOpen", String(sidebarOpen))
  }, [sidebarOpen])

  React.useEffect(() => {
    setSidebarRefreshKey((k) => k + 1)
  }, [conversationId])

  const sidebarWidth = sidebarOpen ? 220 : 44
  const [composerValue, setComposerValue] = React.useState("")

  const lastUserMessage = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].content
    }
    return ""
  }, [messages])

  const handleEditLastUserMessage = React.useCallback(() => {
    setComposerValue(lastUserMessage)
  }, [lastUserMessage])

  const handleRegenerate = React.useCallback(() => {
    regenerate()
  }, [regenerate])

  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] flex overflow-hidden">
      {/* Sidebar */}
      <div
        className="shrink-0 flex flex-col border-r border-border bg-muted/30 transition-all duration-150 ease-in-out overflow-hidden"
        style={{ width: sidebarWidth }}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-1 border-b border-border px-2 h-10 shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Colapsar sidebar" : "Expandir sidebar"}
            className="shrink-0"
          >
            {sidebarOpen ? <PanelLeftCloseIcon className="size-4" /> : <PanelLeftOpenIcon className="size-4" />}
          </Button>
          {sidebarOpen && (
            <>
              <span className="text-[13px] font-semibold text-foreground ml-0.5 truncate">
                Conversaciones
              </span>
              <div className="ml-auto" />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => { newConversation() }}
                aria-label="Nueva conversacion"
              >
                <MessageSquarePlusIcon className="size-4" />
              </Button>
            </>
          )}
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { newConversation() }}
              aria-label="Nueva conversacion"
              className="shrink-0 ml-0.5"
            >
              <MessageSquarePlusIcon className="size-4" />
            </Button>
          )}
        </div>

        {/* Sidebar list */}
        <div className="flex-1 overflow-y-auto py-1.5 px-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ConversationSidebarList
            key={sidebarRefreshKey}
            projectId={PROJECT_ID}
            activeId={conversationId}
            collapsed={!sidebarOpen}
            onSelect={(id) => { loadConversation(id) }}
            onDelete={() => { newConversation() }}
          />
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex min-w-0 min-h-0 flex-1 flex-col">

        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loadingHistory ? (
            <div className="flex min-h-full items-center justify-center pb-16 pt-10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                Cargando historial...
              </div>
            </div>
          ) : messages.length > 0 || pending ? (
            <ChatTranscript
              messages={messages}
              pending={pending}
              loadingPhase={loadingPhase}
              submitTime={submitTime}
              onSendMessage={submit}
              webSearchEnabled={webSearchEnabled}
              onEditLastUserMessage={handleEditLastUserMessage}
              onRegenerateLastMessage={handleRegenerate}
              useContext={contextToggles.rag_chunks || contextToggles.indexed_assets || contextToggles.graph_nodes}
            />
          ) : (
            <EmptyChatState />
          )}
        </div>

        <ChatComposer
          key={conversationId ?? "new"}
          value={composerValue}
          onValueChange={setComposerValue}
          activeProvider={activeProvider}
          error={error}
          pending={pending}
          onSubmit={(content, mentions) => {
            setComposerValue("")
            if (mentions && (mentions.assetIds.length > 0 || mentions.connectorIds.length > 0 || mentions.nodeIds.length > 0)) {
              submit(content, mentions)
            } else {
              submit(content)
            }
          }}
          onToggleContext={() => setContextPanelOpen((v) => !v)}
          contextActive={contextToggles.rag_chunks || contextToggles.indexed_assets || contextToggles.graph_nodes}
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
          onNewChat={() => { setComposerValue(""); newConversation() }}
          onClearChat={() => { setComposerValue(""); newConversation() }}
          onExportChat={() => {
            const text = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n")
            const blob = new Blob([text], { type: "text/markdown" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `geoagents-chat-${conversationId ?? "new"}.md`
            a.click()
            URL.revokeObjectURL(url)
          }}
          onReindex={() => {
            toast({ title: "Reindexando...", description: "Reindexación del catálogo de assets iniciada", variant: "info" })
          }}
        />
      </div>

      <ProjectContextPanel
        projectId={PROJECT_ID}
        open={contextPanelOpen}
        onClose={() => setContextPanelOpen(false)}
        toggles={contextToggles}
        onToggleChange={setContextToggles}
      />
    </section>
  )
}

function EmptyChatState() {
  return (
    <div className="flex min-h-full items-center justify-center pb-16 pt-10">
      <div className="w-full max-w-3xl text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <GeoAgentsIcon className="size-6" variant="nexus" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Geo Agents
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Consulta normas POT, analiza capas GIS, sube archivos o graba una
          nota de campo. El resultado aparece aqui cuando empieces a escribir.
        </p>
      </div>
    </div>
  )
}




