import { useState, useEffect } from "react"
import { Globe, ChevronDown, ChevronUp, ExternalLink, Loader2, Check } from "lucide-react"
import type { ResearchSource } from "@/types/chat"

interface Props {
  sources: ResearchSource[]
  isSearching: boolean
  currentQuery?: string
  elapsedSeconds?: number
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return url
  }
}

export function DeepResearchPanel({
  sources,
  isSearching,
  currentQuery,
  elapsedSeconds,
}: Props) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (isSearching) setOpen(true)
  }, [isSearching])

  const doneSources = sources.filter((s) => s.status === "done")

  return (
    <div className="my-2 rounded-lg border border-border overflow-hidden text-sm bg-muted/20">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
      >
        {isSearching ? (
          <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />
        ) : (
          <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className={cn(
          "flex-1 text-[12px] font-medium",
          isSearching ? "text-blue-500" : "text-muted-foreground"
        )}>
          {isSearching
            ? "Deep Research · buscando..."
            : `Deep Research · ${doneSources.length} fuente${doneSources.length !== 1 ? "s" : ""} consultada${doneSources.length !== 1 ? "s" : ""}`
          }
        </span>
        {elapsedSeconds && elapsedSeconds > 0 && (
          <span className="text-[11px] text-muted-foreground mr-1">
            {elapsedSeconds.toFixed(1)}s
          </span>
        )}
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border/50">
          {isSearching && currentQuery && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/5">
              <Loader2 className="h-3 w-3 text-blue-400 animate-spin shrink-0" />
              <span className="text-[11px] text-blue-400 italic line-clamp-1">
                buscando: &quot;{currentQuery}&quot;
              </span>
            </div>
          )}

          {sources.map((source, i) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors no-underline group"
            >
              <div className="mt-0.5 shrink-0">
                {source.status === "loading" ? (
                  <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
                ) : (
                  <Check className="h-3 w-3 text-emerald-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-emerald-600 line-clamp-1">
                  {getDomain(source.url)}
                </p>
                <p className="text-[12px] text-foreground/80 line-clamp-1 group-hover:text-foreground">
                  {source.title}
                </p>
                {source.snippet && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                    {source.snippet}
                  </p>
                )}
              </div>
              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}

          {sources.length === 0 && !isSearching && (
            <p className="px-3 py-2 text-[11px] text-muted-foreground">
              No se encontraron fuentes.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ")
}
