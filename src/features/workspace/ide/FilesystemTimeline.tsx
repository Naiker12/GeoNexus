import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Activity,
  File,
  Folder,
  Search,
  Plus,
  Pen,
  Trash2,
  ArrowRight,
  Copy,
  BrainCircuit,
  Code2,
  CheckCircle,
  XCircle,
  Clock,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { TimelineEntry } from "@/api/filesystem-timeline"

function toolIcon(toolName: string) {
  switch (toolName) {
    case "listDirectories": return Folder
    case "listFiles": return File
    case "searchFiles": return Search
    case "createFolder": return Folder
    case "createFile": return Plus
    case "updateFile": return Pen
    case "deleteFile": return Trash2
    case "moveFile": return ArrowRight
    case "copyFile": return Copy
    case "detectFramework": return BrainCircuit
    case "analyzeProject": return Code2
    case "createProject": return Code2
    default: return Activity
  }
}

function formatTime(unix: number): string {
  const diff = Date.now() / 1000 - unix
  if (diff < 60) return "now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function toolLabel(toolName: string): string {
  switch (toolName) {
    case "listDirectories": return "List directories"
    case "listFiles": return "List files"
    case "searchFiles": return "Search files"
    case "createFolder": return "Create folder"
    case "createFile": return "Create file"
    case "updateFile": return "Update file"
    case "deleteFile": return "Delete file"
    case "moveFile": return "Move file"
    case "copyFile": return "Copy file"
    case "detectFramework": return "Detect framework"
    case "analyzeProject": return "Analyze project"
    case "createProject": return "Create project"
    default: return toolName
  }
}

export function FilesystemTimeline({
  entries,
  open,
  onOpenChange,
  onClear,
}: {
  entries: TimelineEntry[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onClear: () => void
}) {
  if (!open) return null

  const completedCount = entries.filter(e => e.status === "Completed").length
  const failedCount = entries.filter(e => e.status === "Failed").length

  return (
    <div className="absolute right-3 top-12 z-30 w-72 rounded-lg border border-border bg-card/95 shadow-lg backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Activity className="size-3" />
          Filesystem timeline
          {completedCount > 0 && (
            <span className="text-[0.6rem] text-green-600 dark:text-green-400 ml-1">
              {completedCount} ok
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-[0.6rem] text-red-600 dark:text-red-400 ml-1">
              {failedCount} failed
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[0.65rem]" onClick={onClear}>
            Clear
          </Button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto p-2 [scrollbar-width:thin]">
        {entries.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No filesystem activity yet
          </p>
        ) : (
          entries.map((entry) => {
            const Icon = toolIcon(entry.tool_name)
            return (
              <div
                key={entry.id}
                className="flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
              >
                <div className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                  entry.status === "Completed" ? "bg-green-500" :
                  entry.status === "Failed" ? "bg-red-500" :
                  "bg-blue-500"
                )}>
                  <Icon className="size-3 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {toolLabel(entry.tool_name)}
                  </p>
                  <p className="truncate text-[0.65rem] text-muted-foreground">
                    {entry.path}
                  </p>
                  <p className="text-[0.6rem] text-muted-foreground flex items-center gap-1 mt-0.5">
                    {entry.status === "Started" && (
                      <Clock className="size-2.5 animate-pulse" />
                    )}
                    {entry.status === "Completed" && (
                      <CheckCircle className="size-2.5" />
                    )}
                    {entry.status === "Failed" && (
                      <XCircle className="size-2.5" />
                    )}
                    {formatTime(entry.started_at)}
                    {entry.duration_ms != null && ` · ${entry.duration_ms}ms`}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}


