import * as React from "react"
import { Loader2, Zap, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReasoningStepRow } from "@/components/chat/ReasoningStepRow"
import type { ReasoningTimeline } from "@/types/reasoning-timeline"

interface Props {
  timeline: ReasoningTimeline | null
  isStreaming: boolean
  onToggle: () => void
}

function useElapsedTime(isStreaming: boolean) {
  const [elapsed, setElapsed] = React.useState(0)
  const startRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (isStreaming) {
      startRef.current = Date.now()
      const interval = setInterval(() => {
        setElapsed(Date.now() - (startRef.current ?? Date.now()))
      }, 100)
      return () => clearInterval(interval)
    } else {
      startRef.current = null
      setElapsed(0)
    }
  }, [isStreaming])

  return elapsed
}

export function ReasoningTimelineBlock({ timeline, isStreaming, onToggle }: Props) {
  const elapsed = useElapsedTime(isStreaming)

  const headerText = isStreaming
    ? `Razonando... ${(elapsed / 1000).toFixed(1)}s`
    : timeline
      ? `Razonó durante ${(timeline.totalDurationMs / 1000).toFixed(1)}s`
      : "Razonando..."

  const steps = timeline?.steps.length ?? 0

  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-sm"
      >
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <Loader2 className="size-3.5 animate-spin text-amber-500" />
          ) : (
            <Zap className="size-3.5 text-amber-500" />
          )}
          <span className="text-muted-foreground">
            {headerText}
            {steps > 0 && (
              <span className="ml-2 text-xs">· {steps} pasos</span>
            )}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            timeline?.isCollapsed && "-rotate-90",
          )}
        />
      </button>

      {!timeline?.isCollapsed && timeline?.steps.map((step) => (
        <ReasoningStepRow key={step.id} step={step} />
      ))}
    </div>
  )
}
