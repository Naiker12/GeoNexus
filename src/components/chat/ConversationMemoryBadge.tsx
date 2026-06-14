import { History, Puzzle, Database } from "lucide-react"
import type { SessionSummary } from "@/types/chat"

interface ConversationMemoryBadgeProps {
  summary: SessionSummary
}

export function ConversationMemoryBadge({ summary }: ConversationMemoryBadgeProps) {
  if (summary.message_count <= 1) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1 pb-1.5 text-[11px] text-muted-foreground/70">
      <span className="inline-flex items-center gap-1">
        <History className="size-3" />
        <span>{summary.message_count} mensajes</span>
      </span>

      {summary.skills_in_session.length > 0 && (
        <span className="inline-flex items-center gap-1">
          <span className="text-muted-foreground/30">·</span>
          <Puzzle className="size-3" />
          <span>{summary.skills_in_session.join(", ")}</span>
        </span>
      )}

      {summary.assets_in_session.length > 0 && (
        <span className="inline-flex items-center gap-1">
          <span className="text-muted-foreground/30">·</span>
          <Database className="size-3" />
          <span>{summary.assets_in_session.length} fuentes</span>
        </span>
      )}
    </div>
  )
}
