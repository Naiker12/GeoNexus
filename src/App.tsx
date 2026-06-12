import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toast"
import { GeoAgentsWorkspace } from "@/features/workspace/GeoAgentsWorkspace"
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
    React.useState<ThemePreset["id"]>(() => {
      if (typeof window !== "undefined") {
        return (localStorage.getItem("geonexus.theme") as ThemePreset["id"]) || "geo-light"
      }
      return "geo-light"
    })
  const [configOpen, setConfigOpen] = React.useState(false)
  const activeRoute = useHashRoute()

  React.useEffect(() => {
    localStorage.setItem("geonexus.theme", activeTheme)
  }, [activeTheme])

  React.useEffect(() => {
    document.documentElement.classList.remove(...themeClassNames)
    document.documentElement.classList.add(activeTheme)

    return () => {
      document.documentElement.classList.remove(...themeClassNames)
    }
  }, [activeTheme])

  return (
    <>
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
        onOpenConfig={() => setConfigOpen(true)}
      />
      <SidebarInset className="overflow-hidden">
        <GeoAgentsWorkspace
          activeRoute={activeRoute}
          configOpen={configOpen}
          onConfigOpenChange={setConfigOpen}
        />
      </SidebarInset>
    </SidebarProvider>
      <Toaster />
    </>
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
