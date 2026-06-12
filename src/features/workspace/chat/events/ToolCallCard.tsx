import { useState } from "react"
import {
  Loader2Icon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileIcon,
  FolderIcon,
  SearchIcon,
  WrenchIcon,
} from "lucide-react"
import { useStreamPreview } from "../hooks/useStreamPreview"
import type { ToolCallStreamEvent } from "@/types/chat"

function ToolIcon({ toolName }: { toolName: string }) {
  if (toolName === "read_file") return <FileIcon className="size-3.5 shrink-0 text-primary/70" />
  if (toolName === "list_directory") return <FolderIcon className="size-3.5 shrink-0 text-primary/70" />
  if (toolName === "search_code") return <SearchIcon className="size-3.5 shrink-0 text-primary/70" />
  return <WrenchIcon className="size-3.5 shrink-0 text-primary/70" />
}

function ChunkPreview({ chunks, toolName }: { chunks: { chunk_type: string; content: string }[]; toolName: string }) {
  if (toolName === "read_file" || toolName === "search_code") {
    return (
      <div className="overflow-hidden rounded bg-muted/30 px-2.5 py-2 font-mono text-[10px] text-foreground/60 space-y-0.5">
        {chunks.slice(0, 8).map((c, i) => (
          <div key={i} className="truncate leading-relaxed">
            {c.content}
          </div>
        ))}
        {chunks.length > 8 && (
          <div className="text-muted-foreground/50">...</div>
        )}
      </div>
    )
  }

  if (toolName === "list_directory") {
    return (
      <div className="space-y-0.5 px-1">
        {chunks.slice(0, 10).map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 text-foreground/60">
            {c.content.endsWith("/") ? (
              <FolderIcon className="size-2.5 shrink-0 text-primary/50" />
            ) : (
              <FileIcon className="size-2.5 shrink-0 text-muted-foreground/50" />
            )}
            <span className="truncate">{c.content}</span>
          </div>
        ))}
      </div>
    )
  }

  return null
}

interface Props {
  event: ToolCallStreamEvent
}

export function ToolCallCard({ event }: Props) {
  const [expanded, setExpanded] = useState(false)
  const preview = useStreamPreview(event.event_id)

  const isRunning = event.status === "running"
  const isComplete = event.status === "complete"
  const hasPreview = preview.chunks.length > 0

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border/50 bg-card text-xs">
      <button
        type="button"
        onClick={() => hasPreview && setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40"
        disabled={!hasPreview}
      >
        {isRunning ? (
          <Loader2Icon className="size-3.5 shrink-0 animate-spin text-primary" />
        ) : (
          <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-500" />
        )}
        <ToolIcon toolName={event.tool_name} />
        <span className="font-semibold text-foreground/90">{event.display_name}</span>
        {event.subtitle && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="max-w-[200px] truncate font-mono text-muted-foreground/70">
              {event.subtitle}
            </span>
          </>
        )}
        {isComplete && event.lines_read !== undefined && (
          <span className="ml-1 text-muted-foreground/50">
            ({event.lines_read} líneas)
          </span>
        )}
        {hasPreview && isComplete && (
          <span className="ml-auto">
            {expanded ? (
              <ChevronUpIcon className="size-3 shrink-0 text-muted-foreground/60" />
            ) : (
              <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground/60" />
            )}
          </span>
        )}
      </button>

      {(isRunning || (isComplete && expanded)) && hasPreview && (
        <div className="border-t border-border/30 px-3 py-2">
          <ChunkPreview chunks={preview.chunks} toolName={event.tool_name} />
        </div>
      )}
    </div>
  )
}
