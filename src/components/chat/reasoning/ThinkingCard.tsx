import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThinkingCardProps {
  content: string
  isStreaming?: boolean
  durationMs?: number | null
}

export function ThinkingCard({ content, isStreaming = false, durationMs }: ThinkingCardProps) {
  const [userCollapsed, setUserCollapsed] = useState(false)
  const expanded = isStreaming ? true : !userCollapsed
  const scrollRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 24
  }

  useEffect(() => {
    const el = scrollRef.current
    if (el && isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [content])

  if (!content && !isStreaming) return null

  return (
    <div className={cn(
      "my-1 text-sm relative overflow-hidden rounded-xl border",
      isStreaming ? "border-transparent" : "border-gray-200 dark:border-gray-700"
    )}>
      {/* Animated gradient border when streaming */}
      {isStreaming && (
        <div className="absolute inset-0 rounded-xl p-[1px] overflow-hidden">
          <div className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#3B82F6,#8B5CF6,#EC4899,#3B82F6)]" />
        </div>
      )}
      
      <div className={cn(
        "relative z-10 bg-white dark:bg-gray-900 rounded-xl p-3",
        !isStreaming && "bg-transparent dark:bg-transparent p-0"
      )}>
        <button
          onClick={() => setUserCollapsed((c) => !c)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>
            {isStreaming ? "Thinking…" : `Thought${durationMs ? ` for ${(durationMs / 1000).toFixed(1)}s` : ""}`}
          </span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", expanded ? "rotate-0" : "-rotate-90")} />
        </button>

        {expanded && (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="mt-1.5 text-sm text-muted-foreground/80 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto scroll-smooth"
            style={{ scrollbarWidth: "thin" }}
          >
            {content}
            {isStreaming && <span className="animate-pulse ml-0.5">▌</span>}
          </div>
        )}
      </div>

      {/* Add custom keyframes */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
