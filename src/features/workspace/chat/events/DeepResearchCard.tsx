import { useState } from "react"
import {
  Loader2Icon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GlobeIcon,
} from "lucide-react"
import { useStreamPreview } from "../hooks/useStreamPreview"
import type { DeepResearchStreamEvent } from "@/types/chat"

interface Props {
  event: DeepResearchStreamEvent
}

export function DeepResearchCard({ event }: Props) {
  const [expanded, setExpanded] = useState(false)
  const preview = useStreamPreview(event.event_id)

  const isSearching = event.status === "searching" || event.status === "running"
  const isComplete = event.status === "complete"

  const liveSourceChunks = preview.chunks.filter((c) => c.chunk_type === "source")
  const completedSources = event.sources ?? []

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border/50 bg-card text-xs">
      <button
        type="button"
        onClick={() => isComplete && setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40"
        disabled={!isComplete}
      >
        {isSearching ? (
          <Loader2Icon className="size-3.5 shrink-0 animate-spin text-primary" />
        ) : (
          <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-500" />
        )}
        <span className="font-semibold text-foreground/90">Deep Research</span>
        <span className="text-muted-foreground">·</span>
        {isSearching ? (
          <span className="animate-pulse text-primary/80">buscando...</span>
        ) : (
          <span className="font-medium text-primary/70">
            {event.sources_count} fuentes consultadas
          </span>
        )}
        {isComplete && (
          <span className="ml-auto">
            {expanded ? (
              <ChevronUpIcon className="size-3 shrink-0 text-muted-foreground/60" />
            ) : (
              <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground/60" />
            )}
          </span>
        )}
      </button>

      {isSearching && liveSourceChunks.length > 0 && (
        <div className="space-y-1.5 border-t border-border/30 bg-muted/20 px-3 py-2">
          {liveSourceChunks.map((chunk, i) => (
            <div key={i} className="flex items-center gap-2 text-muted-foreground">
              <Loader2Icon className="size-2.5 shrink-0 animate-spin text-primary/50" />
              <span className="font-medium text-primary/60">{chunk.content}</span>
              {chunk.title && (
                <span className="max-w-[200px] truncate text-muted-foreground/50">
                  {chunk.title}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {isComplete && expanded && (
        <div className="divide-y divide-border/20 border-t border-border/30">
          {completedSources.map((source, i) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <CheckCircle2Icon className="mt-0.5 size-3 shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-1.5">
                  <GlobeIcon className="size-2.5 shrink-0 text-muted-foreground/50" />
                  <span className="text-[10px] font-medium text-primary/70">
                    {source.domain}
                  </span>
                </div>
                <p className="truncate font-medium text-foreground/80 transition-colors group-hover:text-foreground">
                  {source.title}
                </p>
                {source.snippet && (
                  <p className="mt-0.5 leading-relaxed text-muted-foreground/70 line-clamp-2">
                    {source.snippet}
                  </p>
                )}
              </div>
              <ExternalLinkIcon className="mt-0.5 size-3 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
