import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toast"
import { GeoAgentsWorkspace } from "@/features/workspace/GeoAgentsWorkspace"
import { UpdateBanner } from "@/components/UpdateBanner"
import { OnboardingWizard } from "@/features/workspace/onboarding/OnboardingWizard"
import { useOnboarding } from "@/hooks/useOnboarding"
import { NotificationSettingsProvider } from "@/contexts/NotificationSettingsContext"
import { TelegramBridgeMount } from "@/hooks/TelegramBridgeMount"
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts"
import type { ThemePresetId } from "@/types/workspace-types"
import type { ToastPosition } from "@/types/notifications"
import type { CSSProperties } from "react"

const STORAGE_KEY = "geonexus:notification-settings"

function readToastPosition(): ToastPosition {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.toastPosition) return parsed.toastPosition
    }
  } catch { /* ignore */ }
  return "bottom-right"
}

const BUILTIN_THEMES: ThemePresetId[] = [
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
    React.useState<ThemePresetId>(() => {
      if (typeof window !== "undefined") {
        return (localStorage.getItem("geonexus.theme") as ThemePresetId) || "geo-light"
      }
      return "geo-light"
    })
  const [configOpen, setConfigOpen] = React.useState(false)
  const { loading, showWizard, completeOnboarding, dismissOnboarding } = useOnboarding()
  const activeRoute = useHashRoute()

  React.useEffect(() => {
    localStorage.setItem("geonexus.theme", activeTheme)
  }, [activeTheme])

  React.useEffect(() => {
    const allThemeClasses = [...BUILTIN_THEMES]
    document.querySelectorAll<HTMLStyleElement>("[id^='theme-']").forEach(el => {
      const id = el.id.replace("theme-", "")
      if (id) allThemeClasses.push(id as ThemePresetId)
    })
    document.documentElement.classList.remove(...allThemeClasses)
    document.documentElement.classList.add(activeTheme)

    return () => {
      document.documentElement.classList.remove(activeTheme)
    }
  }, [activeTheme])

  useGlobalShortcuts({
    onOpenSettings: () => setConfigOpen(true),
  })

  const toastPosition = readToastPosition()

  return (
    <NotificationSettingsProvider>
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
      <SidebarInset className="overflow-hidden flex flex-col">
        <UpdateBanner />
        <GeoAgentsWorkspace
          activeRoute={activeRoute}
          configOpen={configOpen}
          onConfigOpenChange={setConfigOpen}
        />
      </SidebarInset>
    </SidebarProvider>
      <Toaster position={toastPosition} />
      <TelegramBridgeMount />
      {!loading && (
        <OnboardingWizard
          open={showWizard}
          onComplete={completeOnboarding}
          onDismiss={dismissOnboarding}
        />
      )}
    </NotificationSettingsProvider>
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
