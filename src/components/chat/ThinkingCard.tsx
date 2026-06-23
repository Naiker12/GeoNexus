import * as React from "react"
import { ChevronDown } from "lucide-react"
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
        onClick={() => setUserCollapsed((c) => !c)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Thinking</span>
        <ChevronDown
          className={cn(
            "w-3 h-3 transition-transform",
            expanded ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div
          ref={contentRef}
          className="mt-1.5 text-sm text-muted-foreground/80 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto scroll-smooth"
          style={{ scrollbarWidth: "thin" }}
        >
          {content}
          {isStreaming && <span className="animate-pulse ml-0.5">▌</span>}
        </div>
      )}
    </div>
  )
}
