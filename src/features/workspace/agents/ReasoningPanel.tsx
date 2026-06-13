import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import type { AgentEvent, AgentName } from "@/types/agents"

interface ReasoningPanelProps {
  events: AgentEvent[]
  running: boolean
}

const AGENT_CONFIG: Record<AgentName, { icon: string; label: string }> = {
  planner:   { icon: "🧠", label: "Planner" },
  discovery: { icon: "🔍", label: "Discovery" },
  knowledge: { icon: "📚", label: "Knowledge" },
  mcp:       { icon: "⚡", label: "MCP Tools" },
  reasoning: { icon: "💭", label: "Reasoning" },
  result:    { icon: "✅", label: "Resultado" },
}

export function ReasoningPanel({ events, running }: ReasoningPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [events])

  if (events.length === 0 && !running) return null

  return (
    <div className="rounded-lg border border-border bg-card/80 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agentes</span>
        {running && <Spinner />}
      </div>
      <div className="space-y-0.5">
        {events.map((evt, i) => (
          <EventRow key={i} event={evt} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function EventRow({ event }: { event: AgentEvent }) {
  const cfg = AGENT_CONFIG[event.agent]
  return (
    <div className={cn(
      "flex items-start gap-2.5 py-1 text-sm",
      event.status === "error" && "text-red-500"
    )}>
      <span className="w-5 text-center shrink-0 mt-0.5">
        {event.status === "running" ? <Spinner size="sm" /> : cfg.icon}
      </span>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-xs text-muted-foreground mr-2">{cfg.label}</span>
        <span className="text-foreground/80 text-xs">{event.message}</span>
      </div>
      {event.status === "done" && <span className="text-emerald-500 text-xs shrink-0">✓</span>}
    </div>
  )
}

function Spinner({ size = "default" }: { size?: "sm" | "default" }) {
  return (
    <svg className={cn("animate-spin text-primary", size === "sm" ? "w-3 h-3" : "w-4 h-4")}
      fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
