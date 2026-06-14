import * as React from "react"
import {
  MessageSquarePlusIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "lucide-react"

import { GeoAgentsIcon } from "@/components/brand/GeoAgentsIcon"
import { Button } from "@/components/ui/Button"
import { AgentLifeIndicator } from "@/components/chat/AgentLifeIndicator"
import { ConversationSidebarList } from "@/components/chat/ConversationSidebarList"
import { ModelHeaderPopover } from "@/components/chat/ModelHeaderPopover"
import { ChatComposer } from "@/components/chat/ChatComposer"
import { ChatTranscript } from "@/components/chat/ChatTranscript"
import { ProjectContextPanel } from "@/components/chat/ProjectContextPanel"
import { useChatSession } from "@/components/chat/useChatSession"
import { useConnectors } from "@/contexts/ConnectorsContext"
import type { AiConnector } from "@/features/workspace/workspace-data"
import type { SkillInfo } from "@/types/chat"
import { useToast } from "@/components/ui/toast"
import { useReasoningStream } from "@/components/chat/useReasoningStream"

const PROJECT_ID = "project-default"

type ChatPanelProps = {
  models?: AiConnector[]
}

export function ChatPanel(_props: ChatPanelProps) {
  const { toast } = useToast()
  const { connectors, activeConnectorId, setActiveConnectorId } =
    useConnectors()
  const { steps, isReasoning } = useReasoningStream()
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
    sessionSummary,
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

  const [activeSkills, setActiveSkills] = React.useState<SkillInfo[]>([])

  React.useEffect(() => {
    const handler = (e: Event) => {
      const skill = (e as CustomEvent).detail as SkillInfo
      setActiveSkills(prev => {
        if (prev.some(s => s.id === skill.id)) return prev
        return [...prev, skill]
      })
    }
    window.addEventListener("geonexus:use-skill", handler)
    return () => window.removeEventListener("geonexus:use-skill", handler)
  }, [])

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

        {/* Agent life indicator */}
        <div className="flex shrink-0 items-center border-b border-border/30 bg-muted/20 px-3 h-7">
          <AgentLifeIndicator
            status={pending ? (steps.some(s => s.type === "web_searching") ? "searching" : steps.some(s => s.type === "skills_injected") ? "using_skill" : "thinking") : "idle"}
            conversationCount={messages.filter(m => m.role === "user").length}
          />
        </div>

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
          activeSkills={activeSkills}
          sessionSummary={sessionSummary}
          onRemoveSkill={(id) => setActiveSkills(prev => prev.filter(s => s.id !== id))}
          onSubmit={(content, mentions) => {
            setComposerValue("")
            const fromActive = activeSkills.map(s => s.name)
            const fromMention = mentions?.skillNames ?? []
            const allSkillNames = [...new Set([...fromActive, ...fromMention])]
            submit(content, mentions, allSkillNames.length > 0 ? allSkillNames : undefined)
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
          onMentionSelect={(source) => {
            if (source.kind === "skill") {
              setActiveSkills(prev => {
                if (prev.some(s => s.id === source.id)) return prev
                return [...prev, { id: source.id, name: source.label, category: "tool", description: source.sublabel }]
              })
            }
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




