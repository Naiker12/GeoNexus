import { FileTextIcon, MapPin, Database, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { useState } from "react"
import type { ChunkReference } from "@/types/chat"
import { cn } from "@/lib/utils"

type CitationsBlockProps = {
  chunks: ChunkReference[]
  query?: string
}

function AssetIcon({ name }: { name: string }) {
  const lower = name.toLowerCase()
  if (lower.includes(".geojson") || lower.includes(".shp") || lower.includes(".kml") || lower.includes(".gml")) {
    return <MapPin className="size-3.5 text-amber-500" />
  }
  if (lower.includes(".csv") || lower.includes(".xls") || lower.includes(".db")) {
    return <Database className="size-3.5 text-blue-500" />
  }
  return <FileTextIcon className="size-3.5 text-rose-500" />
}

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const segments = 5
  const filled = Math.round(pct / (100 / segments))
  return (
    <span className="inline-flex gap-0.5" title={`${pct}% relevancia`}>
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block size-1.5 rounded-sm",
            i < filled ? "bg-emerald-500/70" : "bg-muted-foreground/15"
          )}
        />
      ))}
    </span>
  )
}

function highlightText(text: string, query?: string): string {
  if (!query) return text
  const words = query.split(/\s+/).filter(w => w.length > 2)
  if (words.length === 0) return text
  let result = text
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    result = result.replace(regex, '==$1==')
  }
  return result
}

export function CitationsBlock({ chunks, query }: CitationsBlockProps) {
  const [expanded, setExpanded] = useState(false)

  if (chunks.length === 0) return null

  const sorted = [...chunks].sort((a, b) => b.relevance_score - a.relevance_score)

  return (
    <div className="mt-2 rounded-lg border border-border/60 bg-background/40">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <FileTextIcon className="size-3.5" />
        <span>{chunks.length} fuente{chunks.length !== 1 ? "s" : ""} consultada{chunks.length !== 1 ? "s" : ""}</span>
        <span className="ml-auto text-[0.62rem] text-muted-foreground/60">
          {expanded ? "ocultar" : "mostrar"}
        </span>
      </button>
      {expanded && (
        <div className="grid gap-2 border-t border-border/40 px-3 pb-3 pt-2">
          {sorted.map((chunk, i) => {
            const highlighted = highlightText(chunk.text_preview, query)
            return (
              <div
                key={`${chunk.chunk_id}-${i}`}
                className="rounded-md border border-border/40 bg-background/60 p-2 text-xs"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AssetIcon name={chunk.asset_name} />
                    <span className="truncate font-medium text-primary text-[11px]">
                      {chunk.asset_name}
                    </span>
                  </div>
                  <RelevanceBar score={chunk.relevance_score} />
                </div>
                <p className="leading-relaxed text-card-foreground/80 text-[11px]">
                  <HighlightedText text={highlighted} query={query} />
                </p>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground/40">
                  <span>Fragmento {chunk.chunk_index}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function HighlightedText({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>

  const parts = text.split(/(==.+?==)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("==") && part.endsWith("==")) {
          return (
            <mark key={i} className="bg-amber-200/40 dark:bg-amber-500/20 text-inherit rounded-sm px-0.5">
              {part.slice(2, -2)}
            </mark>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
