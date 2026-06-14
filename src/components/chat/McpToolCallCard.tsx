import { useState } from "react"
import { Terminal, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface McpToolCall {
  tool_name: string
  server_id?: string
  args?: string
  result?: string
  duration_ms?: number
}

interface McpToolCallCardProps {
  tool: McpToolCall
}

export function McpToolCallCard({ tool }: McpToolCallCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-indigo-500/5"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="size-3 text-indigo-500" /> : <ChevronRight className="size-3 text-indigo-500" />}
        <Terminal className="size-3.5 text-indigo-500" />
        <span className="font-mono font-medium text-foreground/80">{tool.tool_name}</span>
        {tool.server_id && (
          <span className="text-muted-foreground/50">{tool.server_id}</span>
        )}
        {tool.duration_ms != null && (
          <span className="ml-auto text-muted-foreground/40">
            {(tool.duration_ms / 1000).toFixed(1)}s
          </span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-indigo-500/10 px-3 py-2 space-y-1.5">
          {tool.args && (
            <div>
              <span className="text-[10px] font-medium text-muted-foreground/60">params</span>
              <pre className="mt-0.5 rounded bg-background/60 p-1.5 text-[10px] font-mono text-foreground/70 overflow-x-auto">
                {tool.args}
              </pre>
            </div>
          )}
          {tool.result && (
            <div>
              <span className="text-[10px] font-medium text-muted-foreground/60">resultado</span>
              <pre className="mt-0.5 rounded bg-background/60 p-1.5 text-[10px] font-mono text-foreground/70 overflow-x-auto max-h-24 overflow-y-auto">
                {tool.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
