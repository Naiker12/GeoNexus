"use client"

import {
  Activity01Icon,
  Brain02Icon,
  Clock01Icon,
  CpuIcon,
  DashboardCircleIcon,
  DatabaseIcon,
  Delete02Icon,
  Edit03Icon,
  Folder01Icon,
  GitBranchIcon,
  Image03Icon,
  MoreHorizontalIcon,
  Search01Icon,
  Settings02Icon,
  ZapIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import * as React from "react"

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
  useSidebar,
} from "@/components/ui/sidebar"
import { useLanguage } from "@/i18n/useLanguage"
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
  const { t } = useLanguage()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

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
      className="border-r border-border/70 bg-sidebar/95 backdrop-blur-md select-none transition-all"
      {...props}
    >
      {/* ─── Encabezado: Logo GeoNexus + App Name + BETA + Búsqueda ─── */}
      <SidebarHeader
        className={cn(
          "border-b border-sidebar-border/60",
          isCollapsed ? "flex items-center justify-center p-2.5" : "px-4 py-3.5"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2.5 w-full",
            isCollapsed ? "justify-center" : "justify-between"
          )}
        >
          <a
            href="#chat"
            className="flex items-center gap-2.5 min-w-0 group hover:opacity-90 transition-opacity"
            title="GeoNexus"
          >
            <div className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground border border-border/70 shadow-2xs transition-transform group-hover:scale-105">
              <GeoAgentsLogo variant="icon" className="size-4.5" />
            </div>
            {!isCollapsed && (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-[15px] tracking-tight text-sidebar-foreground font-sans">
                  geonexus
                </span>
                <span className="rounded-full border border-border/80 bg-muted/60 px-1.5 py-0.2 text-[9px] font-mono font-semibold text-muted-foreground uppercase">
                  BETA
                </span>
              </div>
            )}
          </a>

          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              title="Buscar comandos o chats (Ctrl+K)"
            >
              <HugeiconsIcon icon={Search01Icon} strokeWidth={1.75} className="size-4" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={cn("space-y-3", isCollapsed ? "p-1.5" : "px-3 py-2.5")}>
        {/* ─── Menú Principal con Hugeicons (Limpio y Minimalista) ─── */}
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className={cn("space-y-0.5", isCollapsed && "items-center")}>
              {/* 1. Nuevo chat */}
              <SidebarMenuItem className={cn(isCollapsed && "flex justify-center w-full")}>
                <SidebarMenuButton
                  onClick={handleNewChat}
                  isActive={activeRoute === "#chat" && !loading}
                  tooltip={t.sidebar.newChat}
                  className={cn(
                    "group/btn relative rounded-xl transition-all gap-3 font-medium",
                    isCollapsed
                      ? "size-9 p-0 justify-center mx-auto"
                      : "w-full px-2.5 py-2 text-[13.5px]",
                    activeRoute === "#chat"
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <HugeiconsIcon
                    icon={Edit03Icon}
                    strokeWidth={1.75}
                    className="size-4 shrink-0 text-muted-foreground group-hover/btn:text-sidebar-foreground transition-colors"
                  />
                  {!isCollapsed && <span>{t.sidebar.newChat}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 2. Hub de Modelos */}
              <SidebarMenuItem className={cn(isCollapsed && "flex justify-center w-full")}>
                <SidebarMenuButton
                  asChild
                  isActive={activeRoute.startsWith("#mcp") || activeRoute.startsWith("#hub")}
                  tooltip={t.sidebar.hub}
                  className={cn(
                    "group/btn relative rounded-xl transition-all gap-3 font-medium",
                    isCollapsed
                      ? "size-9 p-0 justify-center mx-auto"
                      : "w-full px-2.5 py-2 text-[13.5px]",
                    activeRoute.startsWith("#mcp") || activeRoute.startsWith("#hub")
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <a href="#mcp">
                    <HugeiconsIcon
                      icon={DashboardCircleIcon}
                      strokeWidth={1.75}
                      className="size-4 shrink-0 text-muted-foreground group-hover/btn:text-sidebar-foreground transition-colors"
                    />
                    {!isCollapsed && <span>{t.sidebar.hub}</span>}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 3. Proyectos */}
              <SidebarMenuItem className={cn(isCollapsed && "flex justify-center w-full")}>
                <SidebarMenuButton
                  asChild
                  isActive={activeRoute.startsWith("#files") || activeRoute.startsWith("#projects")}
                  tooltip={t.sidebar.projects}
                  className={cn(
                    "group/btn relative rounded-xl transition-all gap-3 font-medium",
                    isCollapsed
                      ? "size-9 p-0 justify-center mx-auto"
                      : "w-full px-2.5 py-2 text-[13.5px]",
                    activeRoute.startsWith("#files") || activeRoute.startsWith("#projects")
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <a href="#files">
                    <HugeiconsIcon
                      icon={Folder01Icon}
                      strokeWidth={1.75}
                      className="size-4 shrink-0 text-muted-foreground group-hover/btn:text-sidebar-foreground transition-colors"
                    />
                    {!isCollapsed && <span>{t.sidebar.projects}</span>}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 4. Imágenes */}
              <SidebarMenuItem className={cn(isCollapsed && "flex justify-center w-full")}>
                <SidebarMenuButton
                  asChild
                  isActive={activeRoute.startsWith("#images")}
                  tooltip={t.sidebar.images}
                  className={cn(
                    "group/btn relative rounded-xl transition-all gap-3 font-medium",
                    isCollapsed
                      ? "size-9 p-0 justify-center mx-auto"
                      : "w-full px-2.5 py-2 text-[13.5px]",
                    activeRoute.startsWith("#images")
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  <a href="#images">
                    <HugeiconsIcon
                      icon={Image03Icon}
                      strokeWidth={1.75}
                      className="size-4 shrink-0 text-muted-foreground group-hover/btn:text-sidebar-foreground transition-colors"
                    />
                    {!isCollapsed && <span>{t.sidebar.images}</span>}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 5. ... Más herramientas */}
              <SidebarMenuItem className={cn(isCollapsed && "flex justify-center w-full")}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      tooltip={t.sidebar.moreTools}
                      className={cn(
                        "group/btn relative rounded-xl transition-all gap-3 font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                        isCollapsed
                          ? "size-9 p-0 justify-center mx-auto"
                          : "w-full px-2.5 py-2 text-[13.5px]"
                      )}
                    >
                      <HugeiconsIcon
                        icon={MoreHorizontalIcon}
                        strokeWidth={1.75}
                        className="size-4 shrink-0 text-muted-foreground group-hover/btn:text-sidebar-foreground transition-colors"
                      />
                      {!isCollapsed && <span>{t.sidebar.moreTools}</span>}
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    side="right"
                    className="w-56 rounded-2xl p-1.5 shadow-2xl text-xs backdrop-blur-md bg-card/95 border border-border/70 space-y-0.5"
                  >
                    <DropdownMenuItem
                      asChild
                      className="rounded-xl gap-2.5 px-3 py-2 cursor-pointer font-medium text-foreground hover:bg-muted"
                    >
                      <a href="#studio">
                        <HugeiconsIcon
                          icon={GitBranchIcon}
                          strokeWidth={1.75}
                          className="size-4 text-muted-foreground"
                        />
                        <span>Studio de Flujos (DAG)</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild
                      className="rounded-xl gap-2.5 px-3 py-2 cursor-pointer font-medium text-foreground hover:bg-muted"
                    >
                      <a href="#memory">
                        <HugeiconsIcon
                          icon={Brain02Icon}
                          strokeWidth={1.75}
                          className="size-4 text-muted-foreground"
                        />
                        <span>{t.sidebar.memory}</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild
                      className="rounded-xl gap-2.5 px-3 py-2 cursor-pointer font-medium text-foreground hover:bg-muted"
                    >
                      <a href="#automations">
                        <HugeiconsIcon
                          icon={Clock01Icon}
                          strokeWidth={1.75}
                          className="size-4 text-muted-foreground"
                        />
                        <span>{t.sidebar.automations}</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild
                      className="rounded-xl gap-2.5 px-3 py-2 cursor-pointer font-medium text-foreground hover:bg-muted"
                    >
                      <a href="#monitor">
                        <HugeiconsIcon
                          icon={Activity01Icon}
                          strokeWidth={1.75}
                          className="size-4 text-muted-foreground"
                        />
                        <span>{t.sidebar.monitor}</span>
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ─── Sección de Conversaciones Recientes ─── */}
        {!isCollapsed && (
          <SidebarGroup className="pt-2">
            <div className="flex items-center justify-between px-2.5 mb-1">
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground/70 p-0 font-sans">
                {t.sidebar.recents}
              </SidebarGroupLabel>
            </div>

            <SidebarGroupContent>
              <div className="space-y-0.5 overflow-y-auto max-h-[38vh] fade-scroll-y [scrollbar-width:thin] pr-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className="group/item flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all cursor-pointer"
                  >
                    <span className="truncate font-medium">{conv.title || t.sidebar.newChat}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="opacity-0 group-hover/item:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all rounded-lg"
                      title="Eliminar conversación"
                    >
                      <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.75} className="size-3.5" />
                    </button>
                  </div>
                ))}

                {conversations.length === 0 && !loading && (
                  <div className="px-2.5 py-2 text-left">
                    <p className="text-xs text-muted-foreground/70">{t.sidebar.noRecentChats}</p>
                  </div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* ─── Footer: Logo Propio de GeoNexus + Nombre + Configuración ─── */}
      <SidebarFooter
        className={cn(
          "border-t border-sidebar-border/60",
          isCollapsed ? "p-2 flex justify-center" : "px-3 py-2.5"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary shadow-2xs">
              <GeoAgentsLogo variant="icon" className="size-4" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">
                  GeoNexus AI
                </span>
                <span className="text-[10px] text-muted-foreground font-mono leading-tight">
                  Workspace Pro
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              onClick={onOpenConfig}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
              title={t.sidebar.settings}
            >
              <HugeiconsIcon icon={Settings02Icon} strokeWidth={1.75} className="size-4" />
            </button>
          )}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
