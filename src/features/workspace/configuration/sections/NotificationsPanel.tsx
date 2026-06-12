import * as React from "react"
import { Bell, BellOff, Volume2, Monitor } from "lucide-react"
import { useNotificationSettings } from "@/contexts/NotificationSettingsContext"
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/types/notifications"
import type { NotificationChannel, ToastPosition, ToastDuration } from "@/types/notifications"

const POSITION_OPTIONS: { value: ToastPosition; label: string }[] = [
  { value: "bottom-right", label: "Inferior derecha" },
  { value: "bottom-left", label: "Inferior izquierda" },
  { value: "bottom-center", label: "Inferior centro" },
  { value: "top-right", label: "Superior derecha" },
  { value: "top-left", label: "Superior izquierda" },
]

const DURATION_OPTIONS: { value: ToastDuration; label: string }[] = [
  { value: "short", label: "Corta (3s)" },
  { value: "medium", label: "Media (5s)" },
  { value: "long", label: "Larga (8s)" },
  { value: "persist", label: "Persistente" },
]

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  toast: "Toast",
  os: "Sistema",
  sound: "Sonido",
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-primary" : "bg-input"
      }`}
    >
      <span
        className={`pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  )
}

export function NotificationsPanel() {
  const { settings, updateSettings, updatePreference } = useNotificationSettings()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {settings.masterEnabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          <span className="text-sm font-medium">Notificaciones</span>
        </div>
        <Toggle checked={settings.masterEnabled} onChange={(v) => updateSettings({ masterEnabled: v })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={settings.toastPosition}
          onChange={(e) => updateSettings({ toastPosition: e.target.value as ToastPosition })}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          {POSITION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={settings.toastDuration}
          onChange={(e) => updateSettings({ toastDuration: e.target.value as ToastDuration })}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          {DURATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <label className="flex items-center gap-1.5 text-xs">
          <Monitor className="size-3.5" />
          Sistema
          <Toggle checked={settings.osNotificationsEnabled} onChange={(v) => updateSettings({ osNotificationsEnabled: v })} />
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <Volume2 className="size-3.5" />
          Sonido
          <Toggle checked={settings.soundEnabled} onChange={(v) => updateSettings({ soundEnabled: v })} />
        </label>
      </div>

      <hr className="border-border" />

      {CATEGORY_ORDER.map((cat) => {
        const pref = settings.preferences.find((p) => p.category === cat)
        if (!pref) return null
        return (
          <div key={cat} className="flex items-center justify-between">
            <span className="text-sm">{CATEGORY_LABELS[cat]}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {pref.channels.map((ch) => CHANNEL_LABELS[ch]).join(", ")}
              </span>
              <Toggle
                checked={pref.enabled}
                onChange={(v) => updatePreference(cat, { enabled: v })}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
