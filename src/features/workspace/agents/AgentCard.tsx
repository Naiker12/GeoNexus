import { cn } from "@/lib/utils"
import type { AgentName, AgentEvent } from "@/types/agents"

const AGENT_CONFIG: Record<AgentName, { icon: string; label: string; color: string }> = {
  planner:   { icon: "🧠", label: "Planner", color: "bg-violet-500/10 text-violet-600" },
  discovery: { icon: "🔍", label: "Discovery", color: "bg-blue-500/10 text-blue-600" },
  knowledge: { icon: "📚", label: "Knowledge", color: "bg-amber-500/10 text-amber-600" },
  mcp:       { icon: "⚡", label: "MCP Tools", color: "bg-cyan-500/10 text-cyan-600" },
  reasoning: { icon: "💭", label: "Reasoning", color: "bg-purple-500/10 text-purple-600" },
  result:    { icon: "✅", label: "Resultado", color: "bg-emerald-500/10 text-emerald-600" },
}

export function AgentCard({ event, compact }: { event: AgentEvent; compact?: boolean }) {
  const cfg = AGENT_CONFIG[event.agent]

  return (
    <div className={cn(
      "flex items-start gap-2.5 rounded-lg border border-border/60 bg-card/50 p-2.5 transition-all",
      event.status === "running" && "border-primary/30 bg-primary/[0.02]",
      event.status === "done" && "border-emerald-500/20",
      event.status === "error" && "border-red-500/20 bg-red-500/5",
      compact && "p-2"
    )}>
      <div className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md text-sm",
        cfg.color
      )}>
        {event.status === "running" ? "⟳" : cfg.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{cfg.label}</span>
          {event.status === "done" && <span className="text-emerald-500 text-xs">✓</span>}
          {event.status === "error" && <span className="text-red-500 text-xs">✗</span>}
        </div>
        <p className={cn("text-xs text-muted-foreground", compact && "text-[11px]")}>
          {event.message}
        </p>
      </div>
    </div>
  )
}
