import { useState } from "react"
import {
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileTextIcon,
} from "lucide-react"
import { useStreamPreview } from "../hooks/useStreamPreview"
import type { KnowledgeLookupStreamEvent } from "@/types/chat"

interface Props {
  event: KnowledgeLookupStreamEvent
}

export function KnowledgeLookupCard({ event }: Props) {
  const [expanded, setExpanded] = useState(false)
  const preview = useStreamPreview(event.event_id)

  const ragDocs = preview.chunks.filter((c) => c.chunk_type === "rag_doc")
  const hasDocs = ragDocs.length > 0

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border/50 bg-card text-xs">
      <button
        type="button"
        onClick={() => hasDocs && setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40"
        disabled={!hasDocs}
      >
        <CheckCircle2Icon className="size-3.5 shrink-0 text-emerald-500" />
        <BookOpenIcon className="size-3.5 shrink-0 text-primary/60" />
        <span className="font-semibold text-foreground/90">Consultando conocimiento local</span>
        {hasDocs && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-primary/60">
              {ragDocs.length} {ragDocs.length === 1 ? "documento" : "documentos"}
            </span>
          </>
        )}
        {hasDocs && (
          <span className="ml-auto">
            {expanded ? (
              <ChevronUpIcon className="size-3 shrink-0 text-muted-foreground/60" />
            ) : (
              <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground/60" />
            )}
          </span>
        )}
      </button>

      {expanded && hasDocs && (
        <div className="divide-y divide-border/20 border-t border-border/30">
          {ragDocs.map((doc, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2">
              <FileTextIcon className="size-3 shrink-0 text-primary/50" />
              <span className="flex-1 truncate text-foreground/70">{doc.content}</span>
              {doc.score !== undefined && (
                <span className="shrink-0 font-mono text-muted-foreground/50">
                  {(doc.score * 100).toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
