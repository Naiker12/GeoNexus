import * as React from "react"
import { CheckCircle2, Circle, Clock, AlertCircle, Loader2 } from "lucide-react"
import type { AgentEvent } from "@/types/coding-agent"

interface AgentTimelineProps {
  events: AgentEvent[]
}

const eventIcons: Record<string, React.ReactNode> = {
  done: <CheckCircle2 className="size-3.5 text-amber-600" />,
  running: <Loader2 className="size-3.5 text-amber-500 animate-spin" />,
  pending: <Clock className="size-3.5 text-gray-300" />,
  error: <AlertCircle className="size-3.5 text-red-500" />,
}

export function AgentTimeline({ events }: AgentTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Circle className="size-10 mb-3 opacity-30" />
        <p className="text-sm text-center">No hay eventos aún. Activa el agente y describe una tarea.</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {events.map((event, i) => (
        <div key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
          {/* Timeline line */}
          {i < events.length - 1 && (
            <div className="absolute left-[11px] top-5 bottom-0 w-px bg-amber-200/60" />
          )}

          {/* Icon */}
          <div className="relative z-10 mt-0.5 shrink-0">
            {eventIcons[event.status] ?? <Circle className="size-3.5 text-gray-300" />}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                {event.label}
              </span>
              {event.duration !== undefined && (
                <span className="text-[10px] text-muted-foreground">
                  {event.duration}ms
                </span>
              )}
            </div>
            {event.detail && (
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {event.detail}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
