import { cn } from "@/lib/utils"
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  CodeIcon,
  GlobeIcon,
  Loader2Icon,
  ServerIcon,
  TerminalIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react"
import * as React from "react"

export type ToolStatus = "running" | "complete" | "error"

export interface ToolCallProps {
  toolName: string
  args?: Record<string, unknown> | string
  result?: string | unknown
  status?: ToolStatus
  durationMs?: number
  defaultExpanded?: boolean
}

function getToolIcon(toolName: string) {
  const lower = toolName.toLowerCase()
  if (lower.includes("search") || lower.includes("web")) return GlobeIcon
  if (lower.includes("terminal") || lower.includes("bash") || lower.includes("shell"))
    return TerminalIcon
  if (lower.includes("code") || lower.includes("python") || lower.includes("eval")) return CodeIcon
  if (lower.includes("mcp")) return ServerIcon
  return WrenchIcon
}

function getToolTitle(toolName: string) {
  const lower = toolName.toLowerCase()
  if (lower.includes("search")) return "Búsqueda web"
  if (lower.includes("python") || lower.includes("code")) return "Ejecución de código"
  if (lower.includes("terminal") || lower.includes("bash")) return "Terminal"
  if (lower.includes("mcp")) return `Herramienta MCP: ${toolName}`
  return toolName
}

export function ToolCall({
  toolName,
  args,
  result,
  status = "complete",
  durationMs,
  defaultExpanded = false,
}: ToolCallProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded || status === "running")
  const Icon = getToolIcon(toolName)
  const title = getToolTitle(toolName)

  return (
    <div className="my-2 rounded-xl border border-border/70 bg-card/80 text-card-foreground shadow-xs overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left font-medium hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-3.5" />
          </div>
          <span className="truncate font-semibold text-foreground">{title}</span>
          {status === "running" && (
            <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
              <Loader2Icon className="size-3 animate-spin" />
              Ejecutando
            </span>
          )}
          {status === "complete" && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-3" />
              Completado
            </span>
          )}
          {status === "error" && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
              <XCircleIcon className="size-3" />
              Error
            </span>
          )}
          {durationMs && (
            <span className="text-[10px] text-muted-foreground">
              {(durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        <ChevronDownIcon
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-border/50 bg-muted/20 p-3 space-y-2 font-mono text-[11px]">
          {args && (
            <div>
              <p className="font-semibold text-muted-foreground text-[10px] uppercase mb-1">
                Entrada / Parámetros
              </p>
              <pre className="rounded-lg bg-background p-2 text-muted-foreground overflow-x-auto border border-border/40">
                {typeof args === "string" ? args : JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {result !== undefined && result !== null && (
            <div>
              <p className="font-semibold text-muted-foreground text-[10px] uppercase mb-1">
                Resultado
              </p>
              <pre className="rounded-lg bg-background p-2 text-foreground overflow-x-auto border border-border/40 max-h-48">
                {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
