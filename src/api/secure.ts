function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

async function getInvoke() {
  if (!isTauriAvailable()) return null
  try {
    const { invoke } = await import("@tauri-apps/api/core")
    return invoke
  } catch { return null }
}

async function invokeOrFallback<T>(command: string, args: Record<string, unknown>, fallback: T): Promise<T> {
  const invoke = await getInvoke()
  if (!invoke) return fallback
  try { return await invoke<T>(command, args) }
  catch { return fallback }
}

export async function setSecure(key: string, value: string): Promise<void> {
  return invokeOrFallback("set_secure", { key, value }, undefined)
}

export async function getSecure(key: string): Promise<string | null> {
  return invokeOrFallback("get_secure", { key }, null)
}

export async function deleteSecure(key: string): Promise<void> {
  return invokeOrFallback("delete_secure", { key }, undefined)
}
