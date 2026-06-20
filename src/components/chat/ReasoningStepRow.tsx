import * as React from "react"
import { ChevronRight, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AgentStepIcon } from "@/components/chat/AgentStepIcon"
import type { ReasoningStep } from "@/types/reasoning-timeline"

export function ReasoningStepRow({ step }: { step: ReasoningStep }) {
  const [expanded, setExpanded] = React.useState(false)
  const hasSubItems = step.subItems.length > 0

  return (
    <div className="border-t border-border/50 px-3 py-1.5">
      <div className="flex items-center gap-2 text-sm">
        {hasSubItems ? (
          <button onClick={() => setExpanded((e) => !e)} className="shrink-0">
            <ChevronRight
              className={cn("size-3 transition-transform", expanded && "rotate-90")}
            />
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}

        <AgentStepIcon type={step.agentType} />

        <span className="font-medium truncate">{step.agentName}</span>
        <span className="text-muted-foreground truncate">· {step.label}</span>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {step.status === "running" && (
            <span className="flex gap-0.5">
              <span className="size-1 rounded-full bg-blue-500 animate-bounce [animation-delay:0ms]" />
              <span className="size-1 rounded-full bg-blue-500 animate-bounce [animation-delay:150ms]" />
              <span className="size-1 rounded-full bg-blue-500 animate-bounce [animation-delay:300ms]" />
            </span>
          )}
          {step.status === "success" && (
            <>
              <Check className="size-3 text-green-500" />
              {step.durationMs != null && (
                <span className="text-xs text-muted-foreground">
                  {(step.durationMs / 1000).toFixed(1)}s
                </span>
              )}
            </>
          )}
          {step.status === "failed" && <X className="size-3 text-red-500" />}
        </div>
      </div>

      {expanded && hasSubItems && (
        <div className="ml-8 mt-1 flex flex-col gap-0.5">
          {step.subItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <Check className="size-2.5 shrink-0 text-green-500" />
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
