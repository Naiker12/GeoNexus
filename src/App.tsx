import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { GeoNexusWorkspace } from "@/features/workspace/GeoNexusWorkspace"
import type { ThemePreset } from "@/features/workspace/workspace-data"
import type { CSSProperties } from "react"

const themeClassNames: ThemePreset["id"][] = [
  "geo-dark",
  "geo-light",
  "emerald",
  "cobalt",
  "midnight",
  "lagoon",
  "graphite",
  "terra",
]

export default function App() {
  const [activeTheme, setActiveTheme] =
    React.useState<ThemePreset["id"]>("geo-light")
  const activeRoute = useHashRoute()

  React.useEffect(() => {
    document.documentElement.classList.remove(...themeClassNames)
    document.documentElement.classList.add(activeTheme)

    return () => {
      document.documentElement.classList.remove(...themeClassNames)
    }
  }, [activeTheme])

  return (
    <SidebarProvider
      className={`${activeTheme} bg-background text-foreground`}
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
