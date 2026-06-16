/** Detecta si estamos dentro del runtime Tauri o en navegador (vite dev server) */
function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

/** Obtains invoke function safely, returning null if Tauri isn't available */
async function getInvoke() {
  if (!isTauriAvailable()) return null
  try {
    const { invoke } = await import("@tauri-apps/api/core")
    return invoke
  } catch {
    return null
  }
}

export async function sendOsNotification(opts: { title: string; body?: string }) {
  const invoke = await getInvoke()
  if (!invoke) return
  try {
    await invoke("send_os_notification", { title: opts.title, body: opts.body ?? "" })
  } catch {
    /* OS notification no disponible */
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const invoke = await getInvoke()
  if (!invoke) return false
  try {
    return await invoke<boolean>("request_notification_permission")
  } catch {
    return false
  }
}
