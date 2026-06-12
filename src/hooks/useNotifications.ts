import { useCallback } from "react"
import { useToast } from "@/components/ui/toast"
import { useNotificationSettings } from "@/contexts/NotificationSettingsContext"
import { sendOsNotification } from "@/api/notifications"
import type { NotificationCategory, ToastDuration } from "@/types/notifications"

export interface NotifyOptions {
  category: NotificationCategory
  title: string
  message?: string
  duration?: ToastDuration
}

const DURATION_MS: Record<ToastDuration, number | undefined> = {
  short: 3000,
  medium: 5000,
  long: 8000,
  persist: Infinity,
}

export function useNotifications() {
  const { settings } = useNotificationSettings()
  const { toast } = useToast()

  const notify = useCallback(
    (opts: NotifyOptions) => {
      if (!settings.masterEnabled) return

      const pref = settings.preferences.find((p) => p.category === opts.category)
      if (!pref?.enabled) return

      if (pref.channels.includes("toast")) {
        toast({
          title: opts.title,
          description: opts.message,
          duration: DURATION_MS[opts.duration ?? settings.toastDuration],
        })
      }

      if (pref.channels.includes("os") && settings.osNotificationsEnabled) {
        sendOsNotification({ title: opts.title, body: opts.message ?? "" })
      }

      if (pref.channels.includes("sound") && settings.soundEnabled) {
        playNotificationSound()
      }
    },
    [settings, toast]
  )

  return { notify }
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    gain.gain.value = 0.15
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  } catch {
    /* not supported */
  }
}
