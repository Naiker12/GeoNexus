import { Info, Search, Plug, Code2, FileText, Terminal, Bot, type LucideIcon } from "lucide-react"
import type { AgentStepType } from "@/types/reasoning-timeline"

const config: Record<AgentStepType, { icon: LucideIcon; color: string }> = {
  planner: { icon: Info, color: "#6366f1" },
  discovery: { icon: Search, color: "#10b981" },
  tool: { icon: Plug, color: "#f59e0b" },
  coding: { icon: Code2, color: "#f97316" },
  report: { icon: FileText, color: "#ef4444" },
  terminal: { icon: Terminal, color: "#6b7280" },
  custom: { icon: Bot, color: "#8b5cf6" },
}

export function AgentStepIcon({ type }: { type: AgentStepType }) {
  const { icon: Icon, color } = config[type] ?? config.custom
  return <Icon className="size-3.5 shrink-0" style={{ color }} />
}
