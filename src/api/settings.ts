import { invoke } from "@tauri-apps/api/core"

export function getSetting(key: string): Promise<string | null> {
  return invoke<string | null>("get_setting", { key })
}

export function setSetting(key: string, value: string): Promise<void> {
  return invoke("set_setting", { key, value })
}
