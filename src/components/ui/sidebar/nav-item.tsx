import * as React from "react"

import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./menu"
import type { NavItem } from "@/types/workspace-types"

type SidebarNavItemProps = {
  item: NavItem
  activeRoute: string
  depth?: number
  onNavigate?: (url: string) => void
}

const cleanSidebarButton =
  "hover:bg-transparent hover:text-sidebar-foreground data-[active=true]:bg-transparent data-[active=true]:text-sidebar-foreground"

function isActiveRoute(activeRoute: string, itemUrl: string) {
  return activeRoute === itemUrl
}

const SidebarNavItem = React.memo(function SidebarNavItem({
  item,
  activeRoute,
  depth = 0,
  onNavigate,
}: SidebarNavItemProps) {
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
                  <a
                    href={child.url}
                    onClick={onNavigate ? (e) => { e.preventDefault(); onNavigate(child.url!) } : undefined}
                  >
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
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={cleanSidebarButton}
        tooltip={item.title}
      >
        <a
          href={item.url}
          onClick={onNavigate ? (e) => { e.preventDefault(); onNavigate(item.url!) } : undefined}
        >
          <item.icon className="size-4" />
          <span className="truncate">{item.title}</span>
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
})

export { SidebarNavItem }
export type { SidebarNavItemProps }
