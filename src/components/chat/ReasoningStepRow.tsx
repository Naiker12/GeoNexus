import * as React from "react"
import { CheckIcon, ChevronRightIcon, XIcon } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { getStepDisplay } from "@/components/chat/tool-display-config"
import type { ReasoningStep } from "@/types/reasoning-timeline"

interface Props {
  step: ReasoningStep
  index: number
  totalSteps: number
}

function RunningPulse() {
  return (
    <motion.span
      className="flex size-2 shrink-0 rounded-full bg-amber-500"
      animate={{ scale: [1, 1.35, 1], opacity: [0.8, 1, 0.8] }}
      transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
    />
  )
}

function TimelineDot({ status, accent }: { status: string; accent: string }) {
  if (status === "running") {
    return (
      <div className="relative flex items-center justify-center">
        <motion.span
          className="absolute size-4 rounded-full"
          style={{ backgroundColor: accent }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
        />
        <RunningPulse />
      </div>
    )
  }
  if (status === "success") {
    return (
      <span className="flex size-2 shrink-0 rounded-full bg-emerald-500" />
    )
  }
  if (status === "failed") {
    return (
      <span className="flex size-2 shrink-0 rounded-full bg-red-500" />
    )
  }
  return (
    <span className="flex size-2 shrink-0 rounded-full bg-muted-foreground/40" />
  )
}

export function ReasoningStepRow({ step, index, totalSteps }: Props) {
  const [expanded, setExpanded] = React.useState(false)
  const hasSubItems = step.subItems.length > 0
  const display = getStepDisplay(step.id, step.label, step.agentType)
  const Icon = display.Icon
  const isLast = index === totalSteps - 1

  return (
    <div className="relative flex gap-3 px-3 py-2 border-t border-border/55">
      {/* Vertical connector line */}
      {!isLast && (
        <div
          className="absolute left-[17px] top-[30px] w-px"
          style={{
            height: "calc(100% + 4px)",
            background: step.status === "success"
              ? "linear-gradient(to bottom, rgb(34 197 94 / 0.5), rgb(34 197 94 / 0.15))"
              : "linear-gradient(to bottom, rgb(156 163 175 / 0.3), rgb(156 163 175 / 0.1))",
          }}
        />
      )}

      {/* Timeline dot */}
      <div className="flex shrink-0 flex-col items-center pt-[7px]">
        <TimelineDot status={step.status} accent={display.accent} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          {/* Icon circle */}
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full ring-1 ring-border/60"
            style={{ backgroundColor: display.bg, color: display.accent }}
          >
            <Icon className="size-3.5" strokeWidth={2} />
          </span>

          {/* Title + label */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="shrink-0 font-medium text-foreground text-sm leading-tight">
                {display.title}
              </span>
              <span className="text-xs text-muted-foreground/50">·</span>
              <span className="truncate text-xs text-muted-foreground/80">
                {step.label}
              </span>
            </div>
          </div>

          {/* Duration + status */}
          <div className="flex shrink-0 items-center gap-2">
            {step.durationMs != null && (
              <span className="font-mono text-[11px] text-muted-foreground/60">
                {(step.durationMs / 1000).toFixed(1)}s
              </span>
            )}
            {step.status === "running" && !step.durationMs && (
              <span className="font-mono text-[11px] text-muted-foreground/40">
                en curso
              </span>
            )}
            {step.status === "success" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <CheckIcon className="size-3.5 text-emerald-500" strokeWidth={2.3} />
              </motion.div>
            )}
            {step.status === "failed" && (
              <XIcon className="size-3.5 text-red-500" />
            )}
            {hasSubItems && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex size-4 items-center justify-center rounded text-muted-foreground/50 hover:text-foreground transition-colors"
                aria-label={expanded ? "Contraer detalle" : "Expandir detalle"}
              >
                <motion.div
                  animate={{ rotate: expanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRightIcon className="size-3" />
                </motion.div>
              </button>
            )}
          </div>
        </div>

        {/* Sub-items */}
        <AnimatePresence>
          {expanded && hasSubItems && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="ml-9 mt-1.5 grid gap-1">
                {step.subItems.map((item, itemIndex) => {
                  const isLatest = itemIndex === step.subItems.length - 1
                  const isLive = isLatest && step.status === "running"
                  return (
                    <motion.div
                      key={`${step.id}-${itemIndex}`}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(itemIndex * 0.02, 0.15) }}
                      className={cn(
                        "flex min-w-0 items-center gap-1.5 text-xs",
                        isLive ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {isLive ? (
                        <motion.span
                          className="inline-block size-[5px] shrink-0 rounded-full bg-emerald-500"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                        />
                      ) : (
                        <CheckIcon className="size-3 shrink-0 text-emerald-500" />
                      )}
                      <span className={cn("truncate", isLive && "font-medium")}>{item}</span>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
