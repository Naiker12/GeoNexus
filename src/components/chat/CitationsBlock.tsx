import { FileTextIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { useState } from "react"
import type { ChunkReference } from "@/types/chat"
import { cn } from "@/lib/utils"

type CitationsBlockProps = {
  chunks: ChunkReference[]
}

export function CitationsBlock({ chunks }: CitationsBlockProps) {
  const [expanded, setExpanded] = useState(false)

  if (chunks.length === 0) return null

  return (
    <div className="mt-2 rounded-lg border border-border/60 bg-background/40">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDownIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
        <FileTextIcon className="size-3.5" />
        <span>{chunks.length} fuente{chunks.length !== 1 ? "s" : ""} consultada{chunks.length !== 1 ? "s" : ""}</span>
        <span className="ml-auto text-[0.62rem] text-muted-foreground/60">
          {expanded ? "ocultar" : "mostrar"}
        </span>
      </button>
      {expanded && (
        <div className="grid gap-2 border-t border-border/40 px-3 pb-3 pt-2">
          {chunks.map((chunk, i) => (
            <div
              key={`${chunk.chunk_id}-${i}`}
              className="rounded-md border border-border/40 bg-background/60 p-2 text-xs"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate font-medium text-primary">
                  {chunk.asset_name}
                </span>
                <span className="shrink-0 text-[0.62rem] text-muted-foreground">
                  {Math.round(chunk.relevance_score * 100)}% relevancia
                </span>
              </div>
              <p className={cn(
                "leading-relaxed text-card-foreground/80",
                !expanded && "line-clamp-2"
              )}>
                {chunk.text_preview}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
