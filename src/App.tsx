import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { GeoNexusWorkspace } from "@/features/workspace/GeoNexusWorkspace"
import type { ThemePreset } from "@/features/workspace/workspace-data"
import type { CSSProperties } from "react"

export default function App() {
  const [activeTheme, setActiveTheme] =
    React.useState<ThemePreset["id"]>("geo-light")

  return (
    <SidebarProvider
      className={activeTheme}
      style={
        {
          "--sidebar-width": "17.5rem",
        } as CSSProperties
      }
    >
      <AppSidebar activeTheme={activeTheme} onThemeChange={setActiveTheme} />
      <SidebarInset>
        <GeoNexusWorkspace />
      </SidebarInset>
    </SidebarProvider>
  )
}
