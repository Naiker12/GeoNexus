import * as React from "react"
import {
  AudioLinesIcon,
  BrainCircuitIcon,
  DatabaseIcon,
  FileUpIcon,
  FolderPlusIcon,
  GlobeIcon,
  Loader2,
  MenuIcon,
  MessageSquarePlusIcon,
  MicIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  SendIcon,
  SettingsIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"

import { GeoNexusIcon } from "@/components/brand/GeoNexusIcon"
import { Button } from "@/components/ui/Button"
import { ConversationSidebarList } from "@/components/chat/ConversationSidebarList"
import { ModelHeaderPopover } from "@/components/chat/ModelHeaderPopover"
import { ModelSelector } from "@/components/chat/ModelSelector"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupControl,
} from "@/components/ui/input-group"
import { Textarea } from "@/components/ui/Textarea"
import { ChatTranscript } from "@/components/chat/ChatTranscript"
import { ProjectContextPanel } from "@/components/chat/ProjectContextPanel"
import { useChatSession } from "@/components/chat/useChatSession"
import { useConnectors } from "@/contexts/ConnectorsContext"
import type { AiConnector } from "@/features/workspace/workspace-data"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

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
    loadingHistory,
    contextToggles,
    setContextToggles,
    webSearchEnabled,
    setWebSearchEnabled,
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
        {/* Top bar */}
        <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
          <div className="ml-auto">
            <ModelHeaderPopover />
          </div>
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
              onSendMessage={submit}
              webSearchEnabled={webSearchEnabled}
              onEditLastUserMessage={handleEditLastUserMessage}
              onRegenerateLastMessage={handleRegenerate}
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
          onSubmit={(content) => { setComposerValue(""); submit(content) }}
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
          <GeoNexusIcon className="size-6" variant="nexus" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          GeoNexus IA
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Consulta normas POT, analiza capas GIS, sube archivos o graba una
          nota de campo. El resultado aparece aqui cuando empieces a escribir.
        </p>
      </div>
    </div>
  )
}

function ChatComposer({
  value,
  onValueChange,
  activeProvider,
  error,
  pending,
  onSubmit,
  onToggleContext,
  contextActive,
  webSearchEnabled,
  onToggleWebSearch,
}: {
  value: string
  onValueChange: (value: string) => void
  activeProvider: { provider: string; model: string; endpoint: string } | null
  error: string | null
  pending: boolean
  onSubmit: (content: string) => void
  onToggleContext: () => void
  contextActive: boolean
  webSearchEnabled: boolean
  onToggleWebSearch: () => void
}) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const clean = value.trim()
    if (!clean || pending) return
    onValueChange("")
    onSubmit(clean)
  }

  return (
    <div className="mx-auto w-full max-w-3xl shrink-0 border-t border-border bg-background px-4 py-3 sm:px-5">
      <form
        className="rounded-2xl border border-border/80 bg-card/95 p-2 text-card-foreground shadow-xs"
        onSubmit={handleSubmit}
      >
        <InputGroup className="min-h-12 items-center rounded-xl bg-background/95 py-1">
          <InputGroupAddon className="items-center">
            <ToolMenu
              webSearchEnabled={webSearchEnabled}
              onToggleWebSearch={onToggleWebSearch}
            />
          </InputGroupAddon>
          <InputGroupControl className="flex items-center">
            <Textarea
              rows={1}
              value={value}
              autoComplete="off"
              className="max-h-28 min-h-8 border-0 bg-transparent px-1 py-1.5 text-base leading-5 shadow-none focus-visible:ring-0 md:text-sm"
              placeholder="Pregunta lo que quieras"
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
            />
          </InputGroupControl>
          <InputGroupAddon className="items-center">
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Grabar audio">
              <MicIcon className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Modo voz">
              <AudioLinesIcon className="size-4" />
            </Button>
            <ModelSelector>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="rounded-xl"
                aria-label="Modelos y proveedores"
              >
                <MenuIcon className="size-5" />
              </Button>
            </ModelSelector>
            <Button
              type="submit"
              size="icon"
              className="rounded-xl"
              aria-label="Enviar mensaje"
              disabled={pending || !value.trim() || !activeProvider}
            >
              <SendIcon className="size-4" />
            </Button>
          </InputGroupAddon>
        </InputGroup>

        <div className="mt-2 flex flex-wrap gap-1.5 px-2">
          <Button
            type="button"
            variant={contextActive ? "default" : "outline"}
            size="sm"
            onClick={onToggleContext}
          >
            <SparklesIcon className="size-4" />
            {contextActive ? "Contexto activo" : "Usar contexto GIS"}
          </Button>
        </div>

        {webSearchEnabled && (
          <div className="mt-2 flex items-center gap-1.5 px-2">
            <GlobeIcon className="size-3 text-emerald-500" />
            <span className="text-[11px] text-emerald-500 font-medium">
              Búsqueda web activa
            </span>
            <button
              type="button"
              onClick={onToggleWebSearch}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Desactivar búsqueda web"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        )}

        {pending && webSearchEnabled && (
          <div className="mt-2 flex items-center gap-1.5 px-2">
            <Loader2 className="size-3 text-blue-500 animate-spin" />
            <span className="text-[11px] text-blue-500 font-medium">
              Deep Research activo...
            </span>
          </div>
        )}

        {error ? (
          <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  )
}

function ToolMenu({
  webSearchEnabled,
  onToggleWebSearch,
}: {
  webSearchEnabled: boolean
  onToggleWebSearch: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="rounded-xl"
          aria-label="Abrir herramientas"
        >
          <PlusIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={10}
        className="w-72 rounded-xl p-2"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Proyecto</DropdownMenuLabel>
          <DropdownMenuItem className="min-h-8 gap-2 px-2.5 py-1.5">
            <FolderPlusIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">Agregar proyecto</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-8 gap-2 px-2.5 py-1.5">
            <SettingsIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">Configurar proyecto</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Entrada</DropdownMenuLabel>
          <DropdownMenuItem className="min-h-8 gap-2 px-2.5 py-1.5">
            <FileUpIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">
              Agregar fotos y archivos
            </span>
            <DropdownMenuShortcut className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium tracking-normal text-muted-foreground">
              PDF/DXF
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-8 gap-2 px-2.5 py-1.5">
            <MonitorIcon className="size-3.5 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">Controlar este PC</span>
            <DropdownMenuShortcut className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium tracking-normal text-muted-foreground">
              LOCAL
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Herramientas GIS</DropdownMenuLabel>
          <DropdownMenuItem className="gap-3 px-3 py-2">
            <BrainCircuitIcon className="size-4" />
            Razonamiento GIS
            <DropdownMenuShortcut>MCP</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center justify-between gap-2 px-3 py-2"
            onSelect={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-3">
              <GlobeIcon className="size-4 text-muted-foreground" />
              <span className="text-sm">Buscar información</span>
            </div>
            <Switch
              checked={webSearchEnabled}
              onCheckedChange={onToggleWebSearch}
              className="scale-75"
              aria-label="Activar búsqueda en internet"
            />
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-3 px-3 py-2">
              <MoreHorizontalIcon className="size-4" />
              Mas
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56 rounded-xl p-2">
              <DropdownMenuItem>Consultar norma POT</DropdownMenuItem>
              <DropdownMenuItem>Ejecutar buffer</DropdownMenuItem>
              <DropdownMenuItem>Exportar analisis</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-3 px-3 py-2">
            <DatabaseIcon className="size-4" />
            Proyectos
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


