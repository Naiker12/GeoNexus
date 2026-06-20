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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
} from "@/components/ui/sidebar"
import { ThemeSettingsDialog } from "@/features/theme/ThemeSettingsDialog"
import { navigationItems } from "@/constants/workspace"
import type { NavItem, ThemePreset } from "@/types/workspace-types"
import { cn } from "@/lib/utils"

const cleanSidebarButton =
  "hover:bg-transparent hover:text-sidebar-foreground data-[active=true]:bg-transparent data-[active=true]:text-sidebar-foreground"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  activeRoute: string
  activeTheme: ThemePreset["id"]
  onThemeChange: (theme: ThemePreset["id"]) => void
  onOpenConfig: () => void
}

function NavItemButton({ item, activeRoute, depth = 0 }: { item: NavItem; activeRoute: string; depth?: number }) {
  const [expanded, setExpanded] = React.useState(true)
  const hasChildren = item.children && item.children.length > 0
  const isActive = item.url ? isActiveRoute(activeRoute, item.url) : false

  if (hasChildren) {
    return (
      <div>
        <SidebarMenuButton
          className={cleanSidebarButton}
          onClick={() => setExpanded(!expanded)}
          tooltip={item.title}
        >
          <item.icon className="size-4" />
          <span className="truncate">{item.title}</span>
        </SidebarMenuButton>
        {expanded && (
          <SidebarMenuSub>
            {item.children!.map((child) => (
              <SidebarMenuSubItem key={child.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={child.url ? isActiveRoute(activeRoute, child.url) : false}
                  className="hover:bg-transparent hover:text-sidebar-foreground"
                >
                  <a href={child.url}>
                    <child.icon className="size-3.5" />
                    <span className="truncate">{child.title}</span>
                  </a>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        )}
      </div>
    )
  }

  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      className={cleanSidebarButton}
      tooltip={item.title}
    >
      <a href={item.url}>
        <item.icon className="size-4" />
        <span className="truncate">{item.title}</span>
      </a>
    </SidebarMenuButton>
  )
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
                <SidebarMenuItem key={item.title}>
                  <NavItemButton item={item} activeRoute={activeRoute} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.filter((i) => i.title === "Workspace").map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavItemButton item={item} activeRoute={activeRoute} />
                </SidebarMenuItem>
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

function isActiveRoute(activeRoute: string, itemUrl: string) {
  if (itemUrl === "#contenedores-ia") {
    return activeRoute.startsWith("#contenedores-ia")
  }

  return activeRoute === itemUrl
}
