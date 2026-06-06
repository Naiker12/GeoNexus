"use client"

import * as React from "react"
import {
  GalleryVerticalEndIcon,
  MoreHorizontalIcon,
  ServerIcon,
  Settings2Icon,
} from "lucide-react"

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
import { ThemeSettingsDialog } from "@/features/theme/ThemeSettingsDialog"
import {
  navigationItems,
  recentProjects,
  type ThemePreset,
} from "@/features/workspace/workspace-data"
import { cn } from "@/lib/utils"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  activeTheme: ThemePreset["id"]
  onThemeChange: (theme: ThemePreset["id"]) => void
}

export function AppSidebar({
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
                <GalleryVerticalEndIcon className="size-4" />
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
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <div key={item.title}>
                  <a
                    href={item.url}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors hover:bg-sidebar-accent",
                      item.isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="size-4" />
                    <span className="truncate">{item.title}</span>
                  </a>
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
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
                href="#more"
                className="flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <MoreHorizontalIcon className="size-4" />
                More
              </a>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <a
          href="#mcp"
          className="flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors hover:bg-sidebar-accent"
        >
          <ServerIcon className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">
            MCP Servers
          </span>
          <span className="ml-auto rounded-md bg-primary/10 px-1.5 py-0.5 text-xs text-primary group-data-[collapsible=icon]:hidden">
            3
          </span>
        </a>
        <ThemeSettingsDialog
          activeTheme={activeTheme}
          onThemeChange={onThemeChange}
        />
        <a
          href="#configuracion"
          className="flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors hover:bg-sidebar-accent"
        >
          <Settings2Icon className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">
            Configuracion
          </span>
        </a>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
