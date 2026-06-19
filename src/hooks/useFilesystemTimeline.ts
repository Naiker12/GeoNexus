import { useEffect, useRef, useState, useCallback } from "react"
import { subscribeToAllBusEvents, type BusEvent } from "@/api/events"
import type { TimelineEntry } from "@/api/filesystem-timeline"

const FS_ACTIONS = new Set([
  "fs_listDirectories_started", "fs_listDirectories_completed", "fs_listDirectories_failed",
  "fs_listFiles_started", "fs_listFiles_completed", "fs_listFiles_failed",
  "fs_searchFiles_started", "fs_searchFiles_completed", "fs_searchFiles_failed",
  "fs_createFolder_started", "fs_createFolder_completed", "fs_createFolder_failed",
  "fs_createFile_started", "fs_createFile_completed", "fs_createFile_failed",
  "fs_updateFile_started", "fs_updateFile_completed", "fs_updateFile_failed",
  "fs_deleteFile_started", "fs_deleteFile_completed", "fs_deleteFile_failed",
  "fs_moveFile_started", "fs_moveFile_completed", "fs_moveFile_failed",
  "fs_copyFile_started", "fs_copyFile_completed", "fs_copyFile_failed",
  "fs_detectFramework_started", "fs_detectFramework_completed", "fs_detectFramework_failed",
  "fs_analyzeProject_started", "fs_analyzeProject_completed", "fs_analyzeProject_failed",
  "fs_createProject_started", "fs_createProject_completed", "fs_createProject_failed",
])

function parseFsEvent(event: BusEvent): TimelineEntry | null {
  if (event.domain !== "System") return null
  if (!FS_ACTIONS.has(event.action)) return null

  const parts = event.action.split("_")
  const toolAction = parts[0] // fs
  const nameParts = parts.slice(1, -1) // tool name parts
  const statusPart = parts[parts.length - 1] // started/completed/failed

  // Reconstruct tool name (e.g. "listDirectories", "createFile")
  const tool_name = nameParts.join("")
  const status = statusPart === "started" ? "Started" as const
    : statusPart === "completed" ? "Completed" as const
    : "Failed" as const

  const path = (event.payload as Record<string, unknown>)?.path as string | undefined
  const durationMs = (event.payload as Record<string, unknown>)?.duration_ms as number | undefined

  return {
    id: event.id,
    tool_name: tool_name.charAt(0).toLowerCase() + tool_name.slice(1),
    path: path || (event.payload as Record<string, unknown>)?.target_path as string || "unknown",
    status,
    started_at: event.timestamp,
    duration_ms: durationMs ?? null,
  }
}

export function useFilesystemTimeline(maxEntries = 200) {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const unlistenRef = useRef<() => void>()

  useEffect(() => {
    subscribeToAllBusEvents((event) => {
      const entry = parseFsEvent(event)
      if (!entry) return
      setEntries(prev => {
        // If this is a completion/failure, update the matching started entry
        if (entry.status !== "Started") {
          const idx = prev.findIndex(e =>
            e.tool_name === entry.tool_name &&
            e.path === entry.path &&
            e.status === "Started"
          )
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = entry
            return next
          }
        }
        return [entry, ...prev].slice(0, maxEntries)
      })
    }).then((unlisten) => {
      unlistenRef.current = unlisten
    })
    return () => {
      unlistenRef.current?.()
    }
  }, [maxEntries])

  const clearEntries = useCallback(() => setEntries([]), [])

  return { entries, clearEntries }
}
