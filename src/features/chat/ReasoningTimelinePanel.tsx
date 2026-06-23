import { Brain, Wrench, MessageSquare, Zap } from "lucide-react"

import { useReasoningTimeline } from "@/hooks/useReasoningTimeline"
import { cn } from "@/lib/utils"

const STEP_ICONS: Record<string, typeof Brain> = {
  thinking_start: Brain,
  reasoning_delta: Brain,
  tool_call: Wrench,
  text_start: MessageSquare,
  tool_call_start: Wrench,
  tool_call_done: Wrench,
}

export function ReasoningTimelinePanel({ conversationId }: { conversationId: string | null }) {
  const { steps, isThinking } = useReasoningTimeline(conversationId)

  if (steps.length === 0 && !isThinking) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs px-4 text-center">
        El razonamiento del agente aparecerá aquí
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 overflow-y-auto h-full">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Timeline de Razonamiento
      </div>

      {steps.map((step, i) => {
        const Icon = STEP_ICONS[step.type] ?? Zap
        return (
          <div
            key={step.id}
            className={cn(
              "flex gap-2 items-start text-xs",
              "animate-in fade-in slide-in-from-bottom-2 duration-200"
            )}
          >
            <div className="mt-0.5 w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Icon className="w-3 h-3 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium capitalize">{step.type.replace(/_/g, " ")}</span>
              {step.content && (
                <p className="text-muted-foreground truncate">{step.content.slice(0, 80)}</p>
              )}
              {step.tool_name && (
                <code className="text-primary text-[10px]">{step.tool_name}</code>
              )}
            </div>
            <span className="text-muted-foreground/60 flex-shrink-0 text-[10px]">
              {new Date(step.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )
      })}

      {isThinking && (
        <div className="flex gap-2 items-center text-xs text-primary animate-pulse">
          <Brain className="w-4 h-4" />
          <span>Procesando...</span>
        </div>
      )}
    </div>
  )
}
