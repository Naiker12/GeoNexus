import {
  MoreHorizontalIcon,
  PlayIcon,
  Settings2Icon,
  TerminalIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import type { McpServer } from "@/features/workspace/mcp/mcp-data"
import { cn } from "@/lib/utils"

type McpServerCardProps = {
  server: McpServer
  isActive: boolean
  onSelect: () => void
  onPing: () => void
  onEdit: () => void
}

export function McpServerCard({
  server,
  isActive,
  onSelect,
  onPing,
  onEdit,
}: McpServerCardProps) {
  const isOnline = server.status === "online"

  return (
    <article
      className={cn(
        "flex flex-col rounded-lg border bg-card/95 px-2.5 py-2 shadow-sm backdrop-blur transition hover:border-primary/50",
        isActive
          ? "border-emerald-500/50 ring-1 ring-emerald-500/50"
          : "border-border/80"
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-primary ring-1 ring-border">
            <server.icon className="size-3" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xs font-semibold">{server.name}</h2>
            <p className="mt-0.5 truncate font-mono text-[0.6rem] text-muted-foreground">
              {server.url}
            </p>
          </div>
        </div>
        <StatusPill status={server.status} />
      </div>

      <p className="mt-1.5 line-clamp-2 text-[11px] leading-3.5 text-muted-foreground">
        {server.description}
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <MetricCol
          label="TOOLS"
          value={server.tools.toString()}
          valueClass={server.tools === 0 ? "text-amber-500" : "text-emerald-500"}
        />
        <MetricCol
          label="LATENCIA"
          value={server.latency}
          valueClass={isOnline ? "text-emerald-500" : "text-amber-500"}
        />
        {server.errors !== undefined && (
          <MetricCol
            label="ERRORES"
            value={server.errors.toString()}
            valueClass={server.errors > 0 ? "text-destructive" : "text-muted-foreground"}
          />
        )}
        {server.schemaStatus !== undefined && (
          <MetricCol
            label="SCHEMA"
            value={server.schemaStatus}
            valueClass="text-amber-500"
          />
        )}
        {server.authMethod !== undefined && (
          <MetricCol
            label="AUTH"
            value={server.authMethod}
            valueClass="text-amber-500"
          />
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 bg-background h-6.5 text-[11px] px-1.5"
          onClick={onSelect}
        >
          {server.tools > 0 ? (
            <>
              <TerminalIcon className="mr-1 size-3" />
              Ver tools
            </>
          ) : server.schemaStatus ? (
            <>
              <Settings2Icon className="mr-1 size-3" />
              Configurar
            </>
          ) : (
            <>
              <Settings2Icon className="mr-1 size-3" />
              Conectar OAuth
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 bg-background h-6.5 text-[11px] px-1.5"
          onClick={onPing}
        >
          <PlayIcon className="mr-1 size-3" />
          Ping
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 bg-background hidden xl:flex h-6.5 text-[11px] px-1.5"
          onClick={onEdit}
        >
          <Settings2Icon className="mr-1 size-3" />
          Editar
        </Button>
        <Button variant="outline" size="icon" className="shrink-0 bg-background h-6.5 w-7">
          <MoreHorizontalIcon className="size-3" />
        </Button>
      </div>
    </article>
  )
}

function MetricCol({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div>
      <p className="text-[0.58rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-0.5 font-mono text-[11px] font-semibold", valueClass)}>
        {value}
      </p>
    </div>
  )
}

function StatusPill({ status }: { status: McpServer["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[0.7rem] font-medium transition-colors",
        status === "online" && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
        status === "planned" && "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
        status === "degraded" && "bg-amber-500/10 text-amber-500 border border-amber-500/20",
        status === "offline" && "bg-muted text-muted-foreground border border-border"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "online" && "bg-emerald-500",
          status === "planned" && "bg-indigo-400",
          status === "degraded" && "bg-amber-500",
          status === "offline" && "bg-muted-foreground"
        )}
      />
      {status === "planned" ? "pendiente" : status}
    </span>
  )
}
