import { CheckCircle2, Terminal, BrainCircuit, FileSearch, Globe, Puzzle, GitFork, PenLine, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReasoningStepDisplay } from "@/types/chat"

const STEP_ICONS: Record<string, typeof CheckCircle2> = {
  intent_classified: BrainCircuit,
  knowledge_retrieved: FileSearch,
  web_searching: Globe,
  skills_injected: Puzzle,
  mcp_tool_called: Terminal,
  graph_context_loaded: GitFork,
  generating_response: PenLine,
  response_complete: Sparkles,
}

interface ReasoningStepItemProps {
  step: ReasoningStepDisplay
}

export function ReasoningStepItem({ step }: ReasoningStepItemProps) {
  const state = step.status
  const Icon = STEP_ICONS[step.type] ?? CheckCircle2
  const isToolCall = step.type === "mcp_tool_called"

  return (
    <div className={cn(
      "flex flex-col gap-0 py-1 pl-2 transition-opacity duration-300",
      state === "pending" && "opacity-30",
      state === "done" && "opacity-70"
    )}>
      <div className="flex items-center gap-2.5">
        <div className="flex size-4 shrink-0 items-center justify-center">
          {state === "done" && (
            <Icon className={cn(
              "size-3.5",
              isToolCall ? "text-indigo-500" : "text-emerald-500"
            )} />
          )}
          {state === "running" && (
            <span
              style={{ borderTopColor: "#10b981" }}
              className="inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-muted"
            />
          )}
          {state === "pending" && (
            <span className="size-1.5 rounded-full bg-muted-foreground/30" />
          )}
        </div>
        <span className={cn(
          "font-mono text-[11px] leading-relaxed",
          state === "done" && "text-muted-foreground",
          state === "running" && "font-medium text-foreground",
          state === "pending" && "text-muted-foreground/50"
        )}>
          {step.label}
        </span>
        {step.durationMs != null && state === "done" && (
          <span className="ml-auto text-[10px] text-muted-foreground/50 shrink-0">
            {(step.durationMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>
      {step.detail && state === "done" && (
        <span className="pl-6 text-[10px] text-muted-foreground/40 leading-relaxed truncate">
          {step.detail}
        </span>
      )}
    </div>
  )
}
