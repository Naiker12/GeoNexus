import * as React from "react"
import type {
  NotificationCategory,
  NotificationPreference,
  NotificationSettings,
} from "@/types/notifications"
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/types/notifications"

const STORAGE_KEY = "geonexus:notification-settings"

function loadSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed, preferences: parsed.preferences ?? DEFAULT_NOTIFICATION_SETTINGS.preferences }
    }
  } catch { /* ignore */ }
  return DEFAULT_NOTIFICATION_SETTINGS
}

function saveSettings(settings: NotificationSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch { /* ignore */ }
}

interface NotificationSettingsContextValue {
  settings: NotificationSettings
  updateSettings: (updates: Partial<NotificationSettings>) => void
  updatePreference: (category: NotificationCategory, updates: Partial<NotificationPreference>) => void
}

const NotificationSettingsContext = React.createContext<NotificationSettingsContextValue | null>(null)

export function NotificationSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<NotificationSettings>(loadSettings)

  const persist = React.useCallback((next: NotificationSettings) => {
    setSettings(next)
    saveSettings(next)
  }, [])

  const updateSettings = React.useCallback((updates: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates }
      saveSettings(next)
      return next
    })
  }, [])

  const updatePreference = React.useCallback(
    (category: NotificationCategory, updates: Partial<NotificationPreference>) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          preferences: prev.preferences.map((p) =>
            p.category === category ? { ...p, ...updates } : p
          ),
        }
        saveSettings(next)
        return next
      })
    },
    []
  )

  return (
    <NotificationSettingsContext.Provider value={{ settings, updateSettings, updatePreference }}>
      {children}
    </NotificationSettingsContext.Provider>
  )
}

export function useNotificationSettings() {
  const ctx = React.useContext(NotificationSettingsContext)
  if (!ctx) throw new Error("useNotificationSettings debe usarse dentro de <NotificationSettingsProvider>")
  return ctx
}
