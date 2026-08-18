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

export async function getSetting(key: string): Promise<string | null> {
  const invoke = await getInvoke()
  if (!invoke) return null
  return invoke<string | null>("get_setting", { key })
}

export async function setSetting(key: string, value: string): Promise<void> {
  const invoke = await getInvoke()
  if (!invoke) return
  return invoke("set_setting", { key, value })
}
