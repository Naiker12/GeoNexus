/** File system tools for the agent (inspired by Hermes tools/). */

import { invoke } from "@tauri-apps/api/core"

export interface FileEntry {
  name: string
  path: string
  is_dir: boolean
  size_bytes?: number
  modified?: string
}

export async function listFiles(path: string): Promise<FileEntry[]> {
  return await invoke<FileEntry[]>("list_files", { path })
}

export async function readFile(path: string): Promise<string> {
  return await invoke<string>("read_file", { path })
}

export async function writeFile(path: string, content: string): Promise<void> {
  await invoke("write_file", { path, content })
}

export async function deleteFile(path: string): Promise<void> {
  await invoke("delete_file", { path })
}
