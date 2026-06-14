import { useEffect, useState } from "react"
import { FileUpIcon, Loader2Icon, PlugZapIcon, RefreshCwIcon, ServerIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { getSetting } from "@/api/settings"
import type { McpServer } from "@/types/mcp"

interface McpHeaderProps {
  servers: McpServer[]
  pingProgress: { current: number; total: number } | null
  onRegister: () => void
  onPingAll: () => Promise<void>
  onOpenConfig: () => void
}

export function McpHeader({ servers, pingProgress, onRegister, onPingAll, onOpenConfig }: McpHeaderProps) {
  const [rateLimit, setRateLimit] = useState(60)
  const pingingAll = pingProgress !== null
  const activeCount = servers.filter(s => s.status === "online").length
  const notDisabledCount = servers.filter(s => !s.disabled).length
  const toolCount = servers.reduce((acc, s) => acc + (s.tools?.length ?? 0), 0)

  useEffect(() => {
    getSetting("mcp.rate_limit_rpm").then(val => {
      if (val) setRateLimit(Number(val))
    }).catch(() => {})
  }, [])

  const handlePingAll = async () => {
    try { await onPingAll() }
    catch { /* handled in parent */ }
  }

  return (
    <header className="flex flex-col rounded-lg border border-border/80 bg-card/95 shadow-sm backdrop-blur">
      <div className="h-0.5 bg-[linear-gradient(90deg,var(--primary),transparent)]" />
      <div className="flex flex-col gap-3 border-b border-border px-4 py-2.5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ServerIcon className="size-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight">Servidores MCP</h1>
            <p className="truncate font-mono text-[0.65rem] text-muted-foreground">
              mcp-router · rust core
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
            onClick={handlePingAll} disabled={pingingAll || notDisabledCount === 0}>
            {pingingAll ? (
              <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <RefreshCwIcon className="mr-1.5 size-3.5" />
            )}
            {pingingAll
              ? `Probando ${pingProgress.current}/${pingProgress.total}...`
              : "Probar todos"}
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5"
            title="Compatible con claude_desktop_config.json"
            onClick={onOpenConfig}>
            <FileUpIcon className="mr-1.5 size-3.5" />
            Cargar config
          </Button>
          <Button size="sm" className="h-7 text-xs px-2.5" onClick={onRegister}>
            <PlugZapIcon className="mr-1.5 size-3.5" />
            Registrar servidor
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        <MetricBox label="Servidores" value={servers.length}
          suffix="registrados" />
        <MetricBox label="Online" value={activeCount}
          suffix={`de ${servers.length} activos`} accent />
        <MetricBox label="Tools" value={toolCount}
          suffix="expuestas al chat" />
        <MetricBox label="Rate limit" value={rateLimit}
          suffix="req/min global" />
      </div>
    </header>
  )
}

function MetricBox({ label, value, suffix, accent }: { label: string; value: number; suffix: string; accent?: boolean }) {
  return (
    <div className="px-4 py-2">
      <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn(
        "mt-0.5 flex items-baseline gap-1.5 text-lg font-bold",
        accent && "text-emerald-500"
      )}>
        {value}
        <span className="text-[0.65rem] font-normal text-muted-foreground">{suffix}</span>
      </p>
    </div>
  )
}
