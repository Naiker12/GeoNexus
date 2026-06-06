"use client"

import * as React from "react"
import {
  PlusIcon,
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
import { cn } from "@/lib/utils"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  activeRoute: string
  activeTheme: ThemePreset["id"]
  onThemeChange: (theme: ThemePreset["id"]) => void
}

export function AppSidebar({
  activeRoute,
  activeTheme,
  onThemeChange,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="font-semibold">
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
                    "block rounded-lg border border-sidebar-border p-3 text-sm transition-colors hover:bg-sidebar-accent",
                    project.active && "border-sidebar-primary/50 bg-sidebar-accent"
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
              <a
                href="#nuevo-proyecto"
                className="flex h-8 items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/60 px-2 text-sm font-medium text-sidebar-foreground transition-colors hover:border-sidebar-primary/40 hover:bg-sidebar-accent"
              >
                <PlusIcon className="size-4" />
                Crear proyecto
              </a>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Servidores MCP">
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
            <SidebarMenuButton asChild tooltip="Configuracion">
              <a href="#configuracion">
                <Settings2Icon className="size-4" />
                <span>Configuracion</span>
              </a>
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
