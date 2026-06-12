import { useState, useEffect } from "react"
import { openUrl } from "@tauri-apps/plugin-opener"
import { ChevronDown, ChevronUp, ExternalLink, Loader2, Check, CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ResearchSource } from "@/types/chat"

type TauriWindow = Window & { __TAURI__?: Record<string, unknown> }

function isTauri(): boolean {
  return !!(window as TauriWindow).__TAURI__
}

function safeOpenUrl(e: React.MouseEvent<HTMLAnchorElement>, url: string): void {
  if (isTauri()) {
    e.preventDefault()
    openUrl(url).catch(e => console.error("[DeepResearchPanel] Error al abrir URL:", e))
  }
}

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
  const loadingSources = sources.filter((s) => s.status === "loading")

  const progressLabel = isSearching
    ? loadingSources.length > 0
      ? `Analizando ${sources.length} fuente${sources.length !== 1 ? "s" : ""}...`
      : "Buscando fuentes relevantes..."
    : `${doneSources.length} fuente${doneSources.length !== 1 ? "s" : ""} consultada${doneSources.length !== 1 ? "s" : ""}`

  return (
    <div className="my-2 rounded-lg border border-border overflow-hidden text-sm bg-muted/20">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
      >
        {isSearching ? (
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        )}
        <span className="flex-1 min-w-0">
          <span className={cn(
            "text-sm font-semibold",
            isSearching ? "text-blue-500" : "text-foreground"
          )}>
            Deep Research
          </span>
          <span className="text-xs text-muted-foreground mx-1">·</span>
          <span className={cn(
            "text-xs",
            isSearching ? "text-blue-400" : "text-emerald-600 dark:text-emerald-400 font-medium"
          )}>
            {progressLabel}
          </span>
        </span>
        {elapsedSeconds != null && elapsedSeconds > 0 && (
          <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
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
          {isSearching && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/5">
              <Loader2 className="h-3 w-3 text-blue-400 animate-spin shrink-0" />
              <span className="text-[11px] text-blue-400 font-medium">
                {loadingSources.length > 0
                  ? `Leyendo ${loadingSources.length} fuente${loadingSources.length !== 1 ? "s" : ""}...`
                  : "Iniciando búsqueda web..."}
              </span>
            </div>
          )}

          {sources.map((source, i) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => safeOpenUrl(e, source.url)}
              className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-accent/50 transition-colors text-left w-full group
                         border border-transparent hover:border-border/60 rounded-none"
            >
              <div className="mt-0.5 shrink-0">
                {source.status === "loading" ? (
                  <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate">
                  {getDomain(source.url)}
                </p>
                <p className="text-sm font-semibold text-foreground leading-snug mt-0.5 line-clamp-2">
                  {source.title}
                </p>
                {source.snippet && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {source.snippet}
                  </p>
                )}
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
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

