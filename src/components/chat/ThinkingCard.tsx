import * as React from "react"
import { ChevronDown, ChevronRight, Brain } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThinkingCardProps {
  content?: string
  isStreaming?: boolean
}

export function ThinkingCard({ content, isStreaming = false }: ThinkingCardProps) {
  const [userCollapsed, setUserCollapsed] = React.useState(false)
  const hasReasoning = (content?.length ?? 0) > 0
  const expanded = isStreaming ? true : !userCollapsed
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content])

  if (!hasReasoning && !isStreaming) return null

  return (
    <div className="my-1 text-sm">
      <button
        onClick={() => setUserCollapsed(c => !c)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
          <Brain className="w-3.5 h-3.5" />
        </div>
        <span className="font-semibold">
          {isStreaming ? "Thought" : "Thought"}
        </span>
        {isStreaming && (
          <span className="flex gap-0.5 ml-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        )}
        {!isStreaming && (
          <span className="ml-auto">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        )}
      </button>

      {expanded && (
        <div
          ref={contentRef}
          className={cn(
            "mt-2 ml-8 text-sm text-muted-foreground/90 whitespace-pre-wrap leading-relaxed border-l-2 border-amber-200 dark:border-amber-900 pl-3",
            "max-h-64 overflow-y-auto scroll-smooth",
          )}
          style={{ scrollbarWidth: "thin" }}
        >
          {content}
          {isStreaming && <span className="animate-pulse ml-0.5 text-amber-500">▌</span>}
        </div>
      )}
    </div>
  )
}
