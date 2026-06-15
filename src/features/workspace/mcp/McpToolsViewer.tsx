import { TerminalSquareIcon, PuzzleIcon, CheckCircle2Icon, ShieldAlertIcon, CalendarIcon, SearchXIcon } from "lucide-react"
import type { McpServer, McpTool } from "@/types/mcp"
import { cn } from "@/lib/utils"
import { useMcpServers } from "./hooks/useMcpServers"

interface McpToolsViewerProps {
  serverId: string | null
  tools: McpTool[]
}

export function McpToolsViewer({ serverId, tools }: McpToolsViewerProps) {
  const { servers } = useMcpServers()

  if (!serverId) return null

  const server = servers.find(s => s.id === serverId)
  const realTools = tools.filter(t => t.category !== "placeholder" && t.status !== "planned")

  if (realTools.length === 0) {
    return (
      <div className="rounded-lg border border-border/80 bg-card/95 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <TerminalSquareIcon className="size-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {server?.name ?? serverId} — tools
            </h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
          <SearchXIcon className="size-6 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No hay tools descubiertas aún.</p>
          <p className="text-xs text-muted-foreground/60">
            Haz ping al servidor o usa "Descubrir tools".
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/80 bg-card/95 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <TerminalSquareIcon className="size-4 text-emerald-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
            {server?.name ?? serverId} — herramientas expuestas
          </h3>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
          {realTools.length} disponibles
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {realTools.map(tool => (
          <article
            key={tool.name}
            className="flex flex-col justify-between rounded-lg border border-border/60 bg-background/40 p-3 shadow-inner hover:border-emerald-500/30 transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <PuzzleIcon className="size-3.5 text-muted-foreground/70 shrink-0" />
                  <span className="font-mono text-xs font-bold text-foreground truncate">
                    {tool.name}
                  </span>
                </div>
                {tool.category && (
                  <span className="mt-1 inline-block text-[9px] bg-muted text-muted-foreground font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {tool.category}
                  </span>
                )}
              </div>
              <ToolStatusPill status={tool.status} />
            </div>

            <div className="mt-3.5 rounded bg-[#090a0c] border border-border/40 p-2.5 font-mono text-[10px] leading-relaxed shadow-sm">
              <div className="text-muted-foreground/50 select-none pb-1 border-b border-white/[0.02] flex items-center justify-between">
                <span>{"//"} entrada</span>
                <span className="text-[9px] text-muted-foreground/40 font-mono">JSON Schema</span>
              </div>
              <div className="py-1">
                <span className="text-muted-foreground/60 select-none">args: </span>
                <span className="text-[#e06c75] font-semibold">
                  ({tool.args || tool.args_schema ? JSON.stringify(tool.args_schema) || "..." : "void"})
                </span>
              </div>
              <div className="mt-1 pt-1.5 border-t border-white/[0.02] text-muted-foreground/80">
                <span className="text-muted-foreground/50 select-none">retorna: </span>
                <span className="text-[#98c379] font-medium">{tool.result || tool.return_type || "\u2014"}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function ToolStatusPill({ status }: { status: McpTool["status"] }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium select-none border",
      status === "ready" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      status === "guarded" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
      status === "planned" && "bg-muted text-muted-foreground border-border"
    )}>
      {status === "ready" && <><CheckCircle2Icon className="size-2.5" /> listo</>}
      {status === "guarded" && <><ShieldAlertIcon className="size-2.5" /> protegido</>}
      {status === "planned" && <><CalendarIcon className="size-2.5" /> planeado</>}
    </span>
  )
}