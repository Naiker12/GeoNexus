function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined
}

async function getInvoke() {
  if (!isTauriAvailable()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke
  } catch { return null }
}

interface AllowedPathEntry {
  path: string
  level: string
  added_at: string
  label: string
}

interface FilesystemConfig {
  version: number
  allowed_paths: AllowedPathEntry[]
  global_defaults: {
    level: string
    require_confirm_for: string[]
    max_file_size_mb: number
    denied_extensions: string[]
  }
  indexing: {
    enabled: boolean
    exclude_dirs: string[]
  }
}

export type { AllowedPathEntry, FilesystemConfig }

export async function getFilesystemConfig(): Promise<FilesystemConfig | null> {
  const invoke = await getInvoke()
  if (!invoke) return null
  try { return await invoke<FilesystemConfig>("get_filesystem_config") }
  catch { return null }
}

export async function saveFilesystemConfig(config: FilesystemConfig): Promise<boolean> {
  const invoke = await getInvoke()
  if (!invoke) return false
  try { await invoke("save_filesystem_config", { config }); return true }
  catch { return false }
}

export async function isFirstLaunch(): Promise<boolean> {
  const invoke = await getInvoke()
  if (!invoke) return false
  try { return await invoke<boolean>("is_first_launch") }
  catch { return true }
}

export async function setOnboardingCompleted(): Promise<void> {
  const invoke = await getInvoke()
  if (!invoke) return
  try { await invoke("set_onboarding_completed") }
  catch { /* ignore */ }
}
