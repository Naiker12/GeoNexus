/** Detecta si estamos dentro del runtime Tauri */
function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

let invokeFn: typeof import("@tauri-apps/api/core").invoke | null = null

async function ensureInvoke() {
  if (invokeFn) return invokeFn
  if (!isTauriAvailable()) return null
  try {
    const { invoke } = await import("@tauri-apps/api/core")
    invokeFn = invoke
    return invoke
  } catch {
    return null
  }
}

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const fn = await ensureInvoke()
  if (!fn) throw new Error(`Tauri no disponible para: ${command}`)
  return fn<T>(command, args ?? {})
}
