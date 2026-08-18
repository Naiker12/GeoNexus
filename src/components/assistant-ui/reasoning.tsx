import { cn } from "@/lib/utils"
import { BrainIcon, ChevronDownIcon } from "lucide-react"
import * as React from "react"

interface ReasoningProps {
  content?: string
  isStreaming?: boolean
  durationMs?: number
  defaultOpen?: boolean
}

export function Reasoning({
  content,
  isStreaming = false,
  durationMs,
  defaultOpen = false,
}: ReasoningProps) {
  const [open, setOpen] = React.useState(defaultOpen || isStreaming)

  React.useEffect(() => {
    if (isStreaming) {
      setOpen(true)
    }
  }, [isStreaming])

  if (!content && !isStreaming) return null

  const formattedDuration = durationMs ? `${(durationMs / 1000).toFixed(1)}s` : null

  return (
    <div className="my-2 rounded-xl border border-border/60 bg-muted/30 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-left font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <BrainIcon
            className={cn("size-3.5 text-primary", isStreaming && "animate-pulse text-emerald-500")}
          />
          <span>{isStreaming ? "Pensando..." : "Cadena de razonamiento"}</span>
          {formattedDuration && !isStreaming && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {formattedDuration}
            </span>
          )}
        </div>
        <ChevronDownIcon
          className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-border/40 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground/90 whitespace-pre-wrap bg-background/50">
          {content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-3 ml-1 bg-emerald-500 animate-pulse align-middle" />
          )}
        </div>
      )}
    </div>
  )
}
