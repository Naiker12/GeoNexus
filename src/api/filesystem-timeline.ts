export interface TimelineEntry {
  id: string
  tool_name: string
  path: string
  status: "Started" | "Completed" | "Failed"
  started_at: number
  duration_ms: number | null
}

export function getFilesystemTimeline(limit?: number): Promise<TimelineEntry[]> {
  const invoke = () => import("@tauri-apps/api/core").then(m => m.invoke)
  return invoke().then(fn => fn<TimelineEntry[]>("get_filesystem_timeline", { limit })).catch(() => [])
}
