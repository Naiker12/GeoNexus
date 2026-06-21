import * as React from "react"
import { ChevronDownIcon, LoaderCircleIcon, SparklesIcon } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ReasoningStepRow } from "@/components/chat/ReasoningStepRow"
import type { ReasoningTimeline } from "@/types/reasoning-timeline"

interface Props {
  timeline: ReasoningTimeline | null
  isStreaming: boolean
  isCollapsing?: boolean
  onToggle: () => void
}

function useElapsedTime(isStreaming: boolean, fallbackMs: number) {
  const [elapsed, setElapsed] = React.useState(fallbackMs)
  const startRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (isStreaming) {
      startRef.current = Date.now()
      const interval = window.setInterval(() => {
        setElapsed(Date.now() - (startRef.current ?? Date.now()))
      }, 100)
      return () => window.clearInterval(interval)
    }

    startRef.current = null
    setElapsed(fallbackMs)
  }, [isStreaming, fallbackMs])

  return elapsed
}

export function ReasoningTimelineBlock({ timeline, isStreaming, isCollapsing, onToggle }: Props) {
  const reduceMotion = useReducedMotion()
  const steps = timeline?.steps ?? []
  const completedSteps = steps.filter((step) => step.status === "success" || step.status === "failed").length
  const progress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0
  const elapsed = useElapsedTime(isStreaming, timeline?.totalDurationMs ?? 0)
  const isCollapsed = timeline?.isCollapsed ?? false

  const headerText = isStreaming
    ? `Razonando... ${(elapsed / 1000).toFixed(1)}s`
    : timeline
      ? `Razonó durante ${(timeline.totalDurationMs / 1000).toFixed(1)}s`
      : "Razonando..."

  return (
    <motion.div
      className="w-full max-w-[42rem] overflow-hidden rounded-lg border border-border/80 bg-card/70 shadow-sm backdrop-blur-sm"
      animate={!reduceMotion ? {
        opacity: isCollapsing ? 0 : 1,
        y: isCollapsing ? -4 : 0,
      } : {}}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex h-10 w-full items-center justify-between gap-3 px-3 text-sm transition-colors hover:bg-muted/30"
      >
        <div className="flex min-w-0 items-center gap-2">
          {isStreaming ? (
            <LoaderCircleIcon className="size-3.5 animate-spin text-amber-500 motion-reduce:animate-none" />
          ) : (
            <SparklesIcon className="size-3.5 text-amber-500" />
          )}
          <span className="truncate text-muted-foreground">
            {headerText}
            {steps.length > 0 && (
              <span className="ml-1.5 text-xs">· {steps.length} pasos</span>
            )}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isCollapsed ? -90 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Progress bar */}
      <div className="h-px bg-border/70 overflow-hidden">
        <motion.div
          className={cn(
            "h-px bg-amber-500",
            isStreaming && "shadow-[0_0_10px_rgba(245,158,11,0.45)]",
          )}
          animate={{ width: `${isStreaming ? Math.max(progress, 8) : 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Steps with vertical timeline */}
      <AnimatePresence initial={false}>
        {!isCollapsed && !isCollapsing && (
          <motion.div
            key="steps"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {steps.length === 0 && isStreaming && (
              <div className="px-4 py-3 text-xs text-muted-foreground/50">
                Iniciando razonamiento...
              </div>
            )}
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.2) }}
              >
                <ReasoningStepRow step={step} index={index} totalSteps={steps.length} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
