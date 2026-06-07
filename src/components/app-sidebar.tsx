"use client"

import * as React from "react"
import {
  ServerIcon,
  Settings2Icon,
} from "lucide-react"

import { GeoNexusIcon } from "@/components/brand/GeoNexusIcon"
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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className={cn("font-semibold", cleanSidebarButton)}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GeoNexusIcon className="size-5" variant="nexus" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-base font-semibold">
                  GeoNexus
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  IA Espacial
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
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
            <SidebarMenuBadge className="bg-primary/10 text-primary">
              3
            </SidebarMenuBadge>
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
