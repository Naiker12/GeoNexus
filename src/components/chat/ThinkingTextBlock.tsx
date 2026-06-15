import * as React from "react"
import { cn } from "@/lib/utils"

interface ThinkingTextBlockProps {
  text: string
  isStreaming: boolean
  className?: string
}

export function ThinkingTextBlock({ text, isStreaming, className }: ThinkingTextBlockProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom as text comes in
  React.useEffect(() => {
    if (isStreaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [text, isStreaming])

  return (
    <div
      ref={containerRef}
      className={cn(
        "text-[13px] text-muted-foreground leading-relaxed italic pr-2",
        isStreaming ? "max-h-20" : "max-h-32",
        "overflow-y-auto",
        className
      )}
      style={{ scrollbarGutter: "stable" }}
    >
      <span className="whitespace-pre-wrap">
        {text}
        {isStreaming && (
          <span
            className="inline-block align-baseline ml-0.5 w-2 h-4 bg-foreground/50 animate-pulse"
            aria-hidden="true"
          />
        )}
      </span>
    </div>
  )
}
