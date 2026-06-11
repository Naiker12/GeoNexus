import { Loader2Icon } from "lucide-react"
import type { ConnectorStatus } from "@/types/chat"

const badgeConfig: Record<ConnectorStatus, { label: string; className: string; icon?: boolean }> = {
  connected: {
    label: "ACTIVO",
    className: "bg-emerald-500/10 text-emerald-600",
  },
  disconnected: {
    label: "CONECTAR",
    className: "bg-muted text-muted-foreground",
  },
  error: {
    label: "ERROR",
    className: "bg-destructive/10 text-destructive",
  },
  syncing: {
    label: "SYNC",
    className: "bg-amber-500/10 text-amber-600",
    icon: true,
  },
  mcp: {
    label: "MCP",
    className: "bg-indigo-500/10 text-indigo-600",
  },
}

export function ConnectorStatusBadge({ status }: { status: ConnectorStatus }) {
  const cfg = badgeConfig[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6rem] font-medium leading-none ${cfg.className}`}
    >
      {cfg.icon && <Loader2Icon className="size-2.5 animate-spin" />}
      {cfg.label}
    </span>
  )
}
