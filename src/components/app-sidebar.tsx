"use client"

import * as React from "react"
import {
  ActivityIcon,
  ChevronRightIcon,
  ClockIcon,
  FileCodeIcon,
  FlaskConicalIcon,
  FolderIcon,
  GridIcon,
  ImageIcon,
  LayoutGridIcon,
  MessageSquareIcon,
  MoonIcon,
  MoreHorizontalIcon,
  NetworkIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  SquarePenIcon,
  SunIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react"

import { deleteConversation, listConversations } from "@/api/chat"
import { GeoAgentsLogo } from "@/components/brand/GeoAgentsLogo"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/stores/uiStore"
import type { Conversation } from "@/types/chat"
import type { ThemePresetId } from "@/types/workspace-types"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  activeRoute: string
  activeTheme: ThemePresetId
  onThemeChange: (theme: ThemePresetId) => void
  onOpenConfig: () => void
}

const PROJECT_ID = "project-default"

export function AppSidebar({
  activeRoute,
  activeTheme,
  onThemeChange,
  onOpenConfig,
  ...props
}: AppSidebarProps) {
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [loading, setLoading] = React.useState(false)

  const loadRecentConversations = React.useCallback(() => {
    setLoading(true)
    listConversations(PROJECT_ID)
      .then((convs) => setConversations(convs.slice(0, 20)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    loadRecentConversations()
    const handleRefresh = () => loadRecentConversations()
    window.addEventListener("geonexus:conversation-updated", handleRefresh)
    return () => window.removeEventListener("geonexus:conversation-updated", handleRefresh)
  }, [loadRecentConversations])

  const handleNewChat = () => {
    window.location.hash = "#chat"
    window.dispatchEvent(new CustomEvent("geonexus:new-chat"))
  }

  const handleSelectConversation = (id: string) => {
    window.location.hash = "#chat"
    window.dispatchEvent(new CustomEvent("geonexus:load-chat", { detail: { id } }))
  }

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await deleteConversation(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/70 bg-sidebar/95 backdrop-blur-md select-none"
      {...props}
    >
      {/* ─── Encabezado: Logo + Marca + Badge BETA + Buscador ─── */}
      <SidebarHeader className="px-3.5 py-3.5 border-b border-sidebar-border/60">
        <div className="flex items-center justify-between gap-2">
          <a
            href="#chat"
            className="flex items-center gap-2.5 min-w-0 group hover:opacity-90 transition-opacity"
          >
            <div className="relative flex size-8.5 shrink-0 items-center justify-center rounded-2xl bg-muted/70 text-foreground border border-border/70 shadow-2xs transition-transform group-hover:scale-105">
              <GeoAgentsLogo variant="icon" className="size-5" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 group-data-[collapsed=true]:hidden">
              <span className="font-bold text-[15px] tracking-tight text-sidebar-foreground">
                GeoNexus
              </span>
              <span className="rounded-full bg-muted border border-border/70 px-1.5 py-0.2 text-[9px] font-bold tracking-wider uppercase font-mono text-muted-foreground">
                BETA
              </span>
            </div>
          </a>

          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex size-7.5 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors group-data-[collapsed=true]:hidden"
            title="Buscar comandos o chats (Ctrl+K)"
          >
            <SearchIcon className="size-4" />
          </button>
        </div>

        {/* Barra de Búsqueda Rápida Estilo Spotlight */}
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="mt-2.5 flex w-full items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground hover:border-border group-data-[collapsed=true]:hidden"
        >
          <div className="flex items-center gap-2">
            <SearchIcon className="size-3.5 text-muted-foreground/70" />
            <span className="text-xs font-medium text-muted-foreground">Buscar...</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-4.5 select-none items-center gap-0.5 rounded border border-border/80 bg-background/80 px-1.5 font-mono text-[9px] font-semibold text-muted-foreground">
            Ctrl K
          </kbd>
        </button>
      </SidebarHeader>

      <SidebarContent className="px-2.5 py-2.5 space-y-3">
        {/* ─── Navegación Principal con Tipografía Gruesa y Nítida ─── */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {/* 1. Nuevo Chat */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleNewChat}
                  isActive={activeRoute === "#chat" && !loading}
                  className={cn(
                    "group/btn relative rounded-2xl px-3 py-2.5 text-[13.5px] transition-all gap-2.5 font-semibold",
                    activeRoute === "#chat"
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-2xs"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <SquarePenIcon className="size-4.5 shrink-0 text-muted-foreground group-hover/btn:text-sidebar-foreground transition-colors stroke-[2]" />
                  <span>Nuevo chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 2. Modelos e IA (Hub) */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activeRoute.startsWith("#mcp") || activeRoute.startsWith("#hub")}
                  className={cn(
                    "group/btn relative rounded-2xl px-3 py-2.5 text-[13.5px] transition-all gap-2.5 font-semibold",
                    activeRoute.startsWith("#mcp") || activeRoute.startsWith("#hub")
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-2xs"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <a href="#mcp">
                    <GridIcon className="size-4.5 shrink-0 text-muted-foreground group-hover/btn:text-sidebar-foreground transition-colors stroke-[2]" />
                    <span>Modelos e IA</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 3. Memoria y Grafo RAG (Reemplaza a Proyectos) */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activeRoute.startsWith("#memory")}
                  className={cn(
                    "group/btn relative rounded-2xl px-3 py-2.5 text-[13.5px] transition-all gap-2.5 font-semibold",
                    activeRoute.startsWith("#memory")
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-2xs"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <a href="#memory">
                    <NetworkIcon className="size-4.5 shrink-0 text-muted-foreground group-hover/btn:text-sidebar-foreground transition-colors stroke-[2]" />
                    <span>Memoria y Grafo</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 4. Imágenes */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activeRoute.startsWith("#images")}
                  className={cn(
                    "group/btn relative rounded-2xl px-3 py-2.5 text-[13.5px] transition-all gap-2.5 font-semibold",
                    activeRoute.startsWith("#images")
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-2xs"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <a href="#images">
                    <ImageIcon className="size-4.5 shrink-0 text-muted-foreground group-hover/btn:text-sidebar-foreground transition-colors stroke-[2]" />
                    <span>Imágenes</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 5. Entrenamiento */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activeRoute.startsWith("#training")}
                  className={cn(
                    "group/btn relative rounded-2xl px-3 py-2.5 text-[13.5px] transition-all gap-2.5 font-semibold",
                    activeRoute.startsWith("#training")
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-2xs"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <a href="#training">
                    <FlaskConicalIcon className="size-4.5 shrink-0 text-muted-foreground group-hover/btn:text-sidebar-foreground transition-colors stroke-[2]" />
                    <span>Entrenamiento</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 6. Más Opciones */}
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="group/btn relative rounded-2xl px-3 py-2.5 text-[13.5px] font-semibold transition-all gap-2.5 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
                      <MoreHorizontalIcon className="size-4.5 shrink-0 text-muted-foreground group-hover/btn:text-sidebar-foreground transition-colors stroke-[2]" />
                      <span>Más herramientas</span>
                      <ChevronRightIcon className="ml-auto size-3.5 text-muted-foreground/60" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    side="right"
                    className="w-56 rounded-2xl p-1.5 shadow-2xl text-xs backdrop-blur-md bg-card/95 border border-border/70"
                  >
                    <DropdownMenuItem asChild className="rounded-xl gap-2.5 px-3 py-2 cursor-pointer font-medium text-foreground hover:bg-muted">
                      <a href="#tasks">
                        <ZapIcon className="size-4 text-muted-foreground" />
                        <span>Tareas y Agentes</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-xl gap-2.5 px-3 py-2 cursor-pointer font-medium text-foreground hover:bg-muted">
                      <a href="#automations">
                        <FileCodeIcon className="size-4 text-muted-foreground" />
                        <span>Automatizaciones</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-xl gap-2.5 px-3 py-2 cursor-pointer font-medium text-foreground hover:bg-muted">
                      <a href="#uso">
                        <ActivityIcon className="size-4 text-muted-foreground" />
                        <span>Métricas y Uso</span>
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ─── Sección de Conversaciones Recientes ─── */}
        <SidebarGroup className="group-data-[collapsed=true]:hidden pt-2 border-t border-sidebar-border/50">
          <div className="flex items-center justify-between px-3 mb-1.5">
            <SidebarGroupLabel className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider p-0 font-mono">
              Recientes
            </SidebarGroupLabel>
            <ClockIcon className="size-3.5 text-muted-foreground/50" />
          </div>

          <SidebarGroupContent>
            <div className="space-y-0.5 overflow-y-auto max-h-[38vh] [scrollbar-width:thin]">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className="group/item flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-sidebar-foreground/85 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground/60 group-hover/item:text-foreground transition-colors stroke-[2]" />
                    <span className="truncate font-medium">
                      {conv.title || "Nueva conversación"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="opacity-0 group-hover/item:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all rounded-lg"
                    title="Eliminar conversación"
                  >
                    <Trash2Icon className="size-3" />
                  </button>
                </div>
              ))}

              {conversations.length === 0 && !loading && (
                <div className="rounded-2xl border border-dashed border-border/60 p-4 text-center">
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    Aún no hay chats guardados.
                  </p>
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    <PlusIcon className="size-3.5" />
                    Comenzar un chat
                  </button>
                </div>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ─── Footer Limpio: Solo Configuración ─── */}
      <SidebarFooter className="p-2.5 border-t border-sidebar-border/60">
        <button
          type="button"
          onClick={onOpenConfig}
          className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-xs font-bold text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all group-data-[collapsed=true]:justify-center"
          title="Configuración general"
        >
          <SettingsIcon className="size-4 shrink-0 text-muted-foreground group-hover:text-sidebar-foreground transition-colors stroke-[2]" />
          <span className="truncate group-data-[collapsed=true]:hidden">Configuración</span>
        </button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
