"use client"

import * as React from "react"
import { Settings2Icon } from "lucide-react"

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
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarNavItem,
} from "@/components/ui/sidebar"
import { ThemeSettingsDialog } from "@/features/theme/ThemeSettingsDialog"
import { navigationItems } from "@/constants/workspace"
import type { ThemePresetId } from "@/types/workspace-types"
import { cn } from "@/lib/utils"

const cleanSidebarButton =
  "hover:bg-transparent hover:text-sidebar-foreground data-[active=true]:bg-transparent data-[active=true]:text-sidebar-foreground"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  activeRoute: string
  activeTheme: ThemePresetId
  onThemeChange: (theme: ThemePresetId) => void
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
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.filter((i) => ["Chat", "Tareas", "Memoria"].includes(i.title)).map((item) => (
                <SidebarNavItem key={item.title} item={item} activeRoute={activeRoute} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.filter((i) => i.title === "Workspace").map((item) => (
                <SidebarNavItem key={item.title} item={item} activeRoute={activeRoute} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter>
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
