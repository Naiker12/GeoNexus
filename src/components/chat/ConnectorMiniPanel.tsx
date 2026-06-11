import { CloudIcon, CpuIcon, RefreshCwIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { ConnectorStatusBadge } from "@/components/chat/ConnectorStatusBadge"
import type { MentionableSourceItem } from "@/types/chat"

function formatTime(unix: number | null): string {
  if (!unix) return "—"
  const d = new Date(unix * 1000)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "hace segundos"
  if (mins < 60) return `hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
}

export function ConnectorMiniPanel({
  connector,
  onClose,
  onSync,
}: {
  connector: MentionableSourceItem
  onClose: () => void
  onSync?: () => void
}) {
  return (
    <div className="mx-2 mb-1 mt-0 rounded-lg border bg-muted/30 p-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CpuIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium truncate">{connector.label}</span>
              <ConnectorStatusBadge status={connector.status} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {connector.sublabel}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-5 shrink-0"
          onClick={onClose}
        >
          <XIcon className="size-3" />
        </Button>
      </div>

      <div className="mt-2 flex items-center gap-4 text-muted-foreground">
        <div className="flex items-center gap-1">
          <CloudIcon className="size-3" />
          <span>
            {connector.asset_count != null
              ? `${connector.asset_count} activos`
              : "—"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <RefreshCwIcon className="size-3" />
          <span>Último sync: {formatTime(connector.last_synced)}</span>
        </div>
      </div>

      {onSync && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 h-7 w-full gap-1.5 text-xs"
          onClick={onSync}
        >
          <RefreshCwIcon className="size-3" />
          Sincronizar ahora
        </Button>
      )}
    </div>
  )
}
