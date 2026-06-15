import * as React from "react"
import { Terminal, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ToolCallDisplay } from "@/types/chat"

interface ToolCallItemProps {
  tool: ToolCallDisplay
}

function formatArgs(args: Record<string, unknown>): string {
  const vals = Object.values(args)
  if (vals.length === 0) return ""
  if (vals.length === 1) {
    const val = vals[0]
    const str = String(val)
    return str.length > 40 ? str.slice(0, 37) + "…" : str
  }
  return vals.map(v => String(v).slice(0, 20)).join(", ")
}

export function ToolCallItem({ tool }: ToolCallItemProps) {
  const [expanded, setExpanded] = React.useState(false)
  const argsStr = formatArgs(tool.args)
  const hasResult = tool.result !== null && tool.result !== undefined

  return (
    <div className="flex flex-col py-1">
      <button
        type="button"
        onClick={() => hasResult && setExpanded((prev) => !prev)}
        className="flex items-baseline gap-1.5 text-xs text-left cursor-pointer select-none"
      >
        <Terminal className="size-3.5 text-muted-foreground shrink-0" />
        <span className="font-mono text-[11px] font-medium text-foreground">
          {tool.toolName}
        </span>
        {argsStr && (
          <span className="text-[10px] text-muted-foreground max-w-[200px] truncate">
            ({argsStr})
          </span>
        )}
        {tool.durationMs && (
          <span className="text-[10px] text-muted-foreground/50 ml-auto">
            {(tool.durationMs / 1000).toFixed(1)}s
          </span>
        )}
        <span
          className={cn(
            "text-[11px] font-medium ml-1",
            tool.status === "success" && "text-emerald-500",
            tool.status === "error" && "text-red-500",
            tool.status === "running" && "text-muted-foreground"
          )}
        >
          {tool.status === "success" && "✓"}
          {tool.status === "error" && "✗"}
          {tool.status === "running" && (
            <span className="inline-block w-2 h-2 border-2 border-muted border-t-emerald-500 rounded-full animate-spin" />
          )}
        </span>
        {hasResult && (
          <>
            {expanded ? (
              <ChevronDown className="size-3 text-muted-foreground/40" />
            ) : (
              <ChevronRight className="size-3 text-muted-foreground/40" />
            )}
          </>
        )}
      </button>

      {expanded && hasResult && (
        <div className="mt-1 ml-4 p-2 rounded-md bg-muted/50 text-[10px] text-muted-foreground max-h-32 overflow-y-auto">
          <pre className="whitespace-pre-wrap break-words">
            {typeof tool.result === "string"
              ? tool.result
              : JSON.stringify(tool.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
