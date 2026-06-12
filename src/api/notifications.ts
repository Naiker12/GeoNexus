import { invoke } from "@tauri-apps/api/core"

export async function sendOsNotification(opts: { title: string; body?: string }) {
  try {
    await invoke("send_os_notification", { title: opts.title, body: opts.body ?? "" })
  } catch {
    /* OS notification no disponible */
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    return await invoke<boolean>("request_notification_permission")
  } catch {
    return false
  }
}
