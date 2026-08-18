import { isTauriAvailable } from "@/api/invoke"
import { useEffect, useState } from "react"

export interface UpdateInfo {
  available: boolean
  version?: string
  notes?: string
}

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ available: false })
  const [installing, setInstalling] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!isTauriAvailable()) {
        return
      }
      try {
        const { check } = await import("@tauri-apps/plugin-updater")
        const update = await check()
        if (update?.available) {
          setUpdateInfo({
            available: true,
            version: update.version,
            notes: update.body ?? undefined,
          })
        }
      } catch (e) {
        console.warn("Update check failed:", e)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  const installUpdate = async () => {
    if (!isTauriAvailable()) {
      return
    }
    try {
      setInstalling(true)
      const { check } = await import("@tauri-apps/plugin-updater")
      const update = await check()
      if (update?.available) {
        await update.downloadAndInstall()
      }
    } catch (e) {
      console.error("Update install failed:", e)
      setInstalling(false)
    }
  }

  const dismiss = () => {
    setDismissed(true)
  }

  return { updateInfo, installing, installUpdate, dismissed, dismiss }
}
