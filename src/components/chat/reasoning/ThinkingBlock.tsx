import { useState } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"

export interface ThinkingBlockProps {
  content: string
  tokenCount?: number
  isStreaming?: boolean
}

export function ThinkingBlock({ content, tokenCount, isStreaming }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mt-2 overflow-hidden rounded-md border border-stone-200">
      <button
        onClick={() => !isStreaming && setExpanded((v) => !v)}
        className="flex w-full items-center justify-between bg-stone-50 px-3 py-2 text-left transition-colors hover:bg-stone-100 disabled:cursor-default"
        disabled={isStreaming}
      >
        <div className="flex items-center gap-1.5">
          {isStreaming ? (
            <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400" />
          ) : expanded ? (
            <ChevronDown className="h-3 w-3 text-stone-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-stone-400" />
          )}
          <span className="text-[12px] italic text-stone-500">
            {isStreaming ? "Razonando…" : "Ver razonamiento"}
          </span>
        </div>
        {!isStreaming && tokenCount !== undefined && (
          <span className="font-mono text-[11px] text-stone-400">
            {tokenCount.toLocaleString()} tokens
          </span>
        )}
      </button>

      {expanded && !isStreaming && (
        <div className="border-t border-stone-200 bg-white px-3 py-3">
          <p className="text-[13px] font-light leading-relaxed text-stone-500 whitespace-pre-wrap">
            {content}
          </p>
        </div>
      )}
    </div>
  )
}
