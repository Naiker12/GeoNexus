import { isTauriAvailable } from "@/api/invoke"

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
