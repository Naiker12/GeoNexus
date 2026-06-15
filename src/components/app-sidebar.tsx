"use client"

import * as React from "react"
import {
  ServerIcon,
  Settings2Icon,
} from "lucide-react"

import { GeoAgentsLogo } from "@/components/brand/GeoAgentsLogo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { ThemeSettingsDialog } from "@/features/theme/ThemeSettingsDialog"
import {
  navigationItems,
  recentProjects,
  type ThemePreset,
} from "@/features/workspace/workspace-data"
import { CreateProjectDialog } from "@/features/workspace/projects/CreateProjectDialog"
import { useMcpServers } from "@/features/workspace/mcp/hooks/useMcpServers"
import { cn } from "@/lib/utils"

const cleanSidebarButton =
  "hover:bg-transparent hover:text-sidebar-foreground data-[active=true]:bg-transparent data-[active=true]:text-sidebar-foreground"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  activeRoute: string
  activeTheme: ThemePreset["id"]
  onThemeChange: (theme: ThemePreset["id"]) => void
  onOpenConfig: () => void
}

export function AppSidebar({
  activeRoute,
  activeTheme,
  onThemeChange,
  onOpenConfig,
  ...props
}: AppSidebarProps) {
  const { onlineCount } = useMcpServers()
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className={cn("font-semibold", cleanSidebarButton)}
            >
              <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary/10">
                <GeoAgentsLogo variant="icon" className="size-9 shrink-0" />
              </div>
              <div className="grid flex-1 text-left leading-tight group-data-[collapsed=true]:hidden">
                <span className="truncate text-base font-semibold">
                  GeoAgents
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  Plataforma de Agentes IA
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Agentes</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.filter((i) => i.title === "Chat IA" || i.title === "Mapa" || i.title === "Agentes").map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActiveRoute(activeRoute, item.url)}
                    className={cleanSidebarButton}
                    tooltip={item.title}
                  >
                  <a
                    href={item.url}
                  >
                    <item.icon className="size-4" />
                    <span className="truncate">{item.title}</span>
                  </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Contenido</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.filter((i) => i.title === "Documentos" || i.title === "Conocimiento" || i.title === "Datos").map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActiveRoute(activeRoute, item.url)}
                    className={cleanSidebarButton}
                    tooltip={item.title}
                  >
                  <a
                    href={item.url}
                  >
                    <item.icon className="size-4" />
                    <span className="truncate">{item.title}</span>
                  </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.filter((i) => i.title === "Conectores" || i.title === "Uso" || i.title === "Skills").map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActiveRoute(activeRoute, item.url)}
                    className={cleanSidebarButton}
                    tooltip={item.title}
                  >
                  <a
                    href={item.url}
                  >
                    <item.icon className="size-4" />
                    <span className="truncate">{item.title}</span>
                  </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Proyectos</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-1">
              {recentProjects.map((project) => (
                <a
                  key={project.name}
                  href="#project"
                  className={cn(
                    "block rounded-lg border border-sidebar-border bg-transparent p-3 text-sm transition-colors hover:border-sidebar-primary/40 hover:bg-transparent",
                    project.active && "border-sidebar-primary/50"
                  )}
                >
                  <span className="block truncate font-medium">
                    {project.name}
                  </span>
                  <span className="mt-1 block text-xs text-sidebar-foreground/65">
                    {project.layers} capas / {project.analyses} analisis
                  </span>
                </a>
              ))}
              <CreateProjectDialog />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className={cleanSidebarButton}
              tooltip="Servidores MCP"
            >
              <a href="#mcp">
                <ServerIcon className="size-4" />
                <span>Servidores MCP</span>
              </a>
            </SidebarMenuButton>
            {onlineCount > 0 && (
              <SidebarMenuBadge className="bg-emerald-500/10 text-emerald-500">
                {onlineCount}
              </SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
        <ThemeSettingsDialog
          activeTheme={activeTheme}
          onThemeChange={onThemeChange}
        />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className={cleanSidebarButton}
              tooltip="Configuracion"
              onClick={onOpenConfig}
            >
              <Settings2Icon className="size-4" />
              <span>Configuracion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function isActiveRoute(activeRoute: string, itemUrl: string) {
  if (itemUrl === "#contenedores-ia") {
    return activeRoute.startsWith("#contenedores-ia")
  }

  return activeRoute === itemUrl
}
