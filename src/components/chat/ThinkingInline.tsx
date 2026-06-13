import * as React from "react"
import { CheckCircle2, ChevronRight, ChevronDown, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getContextualSteps, computeStepStates } from "@/components/chat/contextualSteps"
import type { ChatLoadingPhase } from "@/components/chat/ChatLoadingIndicator"

interface ThinkingInlineProps {
  phase: ChatLoadingPhase
  startTime?: number | null
  query?: string
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      style={{ borderTopColor: "#10b981" }}
      className={cn(
        "inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-muted",
        className
      )}
      aria-hidden="true"
    />
  )
}

export function ThinkingInline({ phase, startTime, query = "" }: ThinkingInlineProps) {
  const [open, setOpen] = React.useState(true)
  const [elapsed, setElapsed] = React.useState(0)
  const isComplete = phase === "idle" || phase === "done"

  React.useEffect(() => {
    if (!startTime) return
    if (isComplete) {
      setElapsed((Date.now() - startTime) / 1000)
      const t = setTimeout(() => setOpen(false), 1500)
      return () => clearTimeout(t)
    }
    setOpen(true)
    const id = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000)
    }, 100)
    return () => clearInterval(id)
  }, [startTime, isComplete])

  const steps = React.useMemo(() => getContextualSteps(query), [query])
  const states = computeStepStates(steps, phase)

  const allDone = isComplete
  const activeStep = steps.find((_, i) => states[i] === "active")

  const summary = isComplete
    ? `Razonamiento completado · ${elapsed.toFixed(1)}s`
    : activeStep
      ? `${activeStep.label} · ${elapsed.toFixed(1)}s`
      : `Analizando · ${elapsed.toFixed(1)}s`

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex cursor-pointer select-none items-center gap-1.5 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground w-full text-left"
        >
          <span className="shrink-0">
            {allDone
              ? <Sparkles className="size-3.5 text-emerald-500" />
              : <Spinner />
            }
          </span>
          <span className="text-xs font-medium text-muted-foreground/80 truncate">
            {summary}
          </span>
          <span className="ml-auto shrink-0">
            {open
              ? <ChevronDown className="size-3 opacity-60" />
              : <ChevronRight className="size-3 opacity-60" />
            }
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="relative ml-0 mt-1 flex flex-col gap-0 rounded-lg bg-muted/30 px-3 py-2">
          <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-emerald-500/50" />
          {steps.map((step, i) => {
            const state = states[i]
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-2.5 py-1 pl-2.5 transition-opacity duration-300",
                  state === "pending" && "opacity-30"
                )}
              >
                <div className="flex size-3.5 shrink-0 items-center justify-center">
                  {state === "done" && (
                    <CheckCircle2 className="size-3 text-emerald-500" />
                  )}
                  {state === "active" && <Spinner className="size-3" />}
                  {state === "pending" && (
                    <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
                <span className={cn(
                  "font-mono text-[11px] leading-relaxed",
                  state === "done" && "text-muted-foreground",
                  state === "active" && "font-medium text-foreground",
                  state === "pending" && "text-muted-foreground/50"
                )}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
