import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { GeoNexusWorkspace } from "@/features/workspace/GeoNexusWorkspace"
import type { ThemePreset } from "@/features/workspace/workspace-data"
import type { CSSProperties } from "react"

export default function App() {
  const [activeTheme, setActiveTheme] =
    React.useState<ThemePreset["id"]>("geo-light")
  const activeRoute = useHashRoute()

  return (
    <SidebarProvider
      className={activeTheme}
      style={
        {
          "--sidebar-width": "17.5rem",
        } as CSSProperties
      }
    >
      <AppSidebar
        activeRoute={activeRoute}
        activeTheme={activeTheme}
        onThemeChange={setActiveTheme}
      />
      <SidebarInset>
        <GeoNexusWorkspace activeRoute={activeRoute} />
      </SidebarInset>
    </SidebarProvider>
  )
}

function useHashRoute() {
  const getRoute = React.useCallback(
    () => window.location.hash || "#chat",
    []
  )
  const [route, setRoute] = React.useState(getRoute)

  React.useEffect(() => {
    const handleHashChange = () => setRoute(getRoute())

    handleHashChange()
    window.addEventListener("hashchange", handleHashChange)

    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [getRoute])

  return route
}
