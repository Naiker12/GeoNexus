import * as React from "react"
import { invoke } from "@tauri-apps/api/core"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toast"
import { GeoAgentsWorkspace } from "@/features/workspace/GeoAgentsWorkspace"
import { UpdateBanner } from "@/components/UpdateBanner"
import { NotificationSettingsProvider } from "@/contexts/NotificationSettingsContext"
import { useTelegramBridge } from "@/hooks/useTelegramBridge"
import { useConnectors } from "@/contexts/ConnectorsContext"
import type { ThemePreset } from "@/features/workspace/workspace-data"
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

function useTelegramSendToLlm() {
  const { connectors, activeConnectorId } = useConnectors()

  return React.useCallback(async (text: string): Promise<string> => {
    const active = connectors.find(c => c.id === activeConnectorId)
    if (!active) {
      return "No hay un proveedor LLM activo. Ve a Configuración → Conexiones y activa un conector primero."
    }
    if (!active.endpoint) {
      return `El conector "${active.name}" no tiene endpoint configurado. Edítalo en Configuración → Conexiones.`
    }
    if (!active.model) {
      return `El conector "${active.name}" no tiene modelo configurado. Edítalo en Configuración → Conexiones.`
    }

    const result = await invoke<{ status: string; text?: string; message?: string }>("send_llm_message", {
      request: {
        provider_type: active.id,
        model: active.model,
        endpoint: active.endpoint,
        prompt: text,
        api_key: active.apiKey ?? null,
      },
    })

    if (result.status === "ok" && result.text) {
      return result.text.trim()
    }
    return result.message ?? "Error desconocido del LLM"
  }, [connectors, activeConnectorId])
}

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
  const sendToLlm = useTelegramSendToLlm()

  // Bridge Telegram siempre montado — escucha mientras el bot esté activo
  useTelegramBridge({ enabled: true, sendToLlm })

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
