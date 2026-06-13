import * as React from "react"
import {
  EyeIcon, PencilIcon, RefreshCwIcon, Trash2Icon, XCircleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { SettingsDialog } from "@/features/workspace/configuration/settings-types"
import { CheckRow } from "@/features/workspace/configuration/settings-ui"
import { useMcpServers } from "@/features/workspace/mcp/hooks/useMcpServers"
import { listMcpAllowlist, deleteMcpAllowlist, deleteMcpServer } from "@/api/mcp"
import type { AllowlistRule } from "@/types/mcp"

export function McpRulesTable({
  onDialogChange,
}: {
  onDialogChange: (dialog: SettingsDialog) => void
}) {
  const { servers, refresh } = useMcpServers()
  const [rules, setRules] = React.useState<Record<string, AllowlistRule>>({})

  React.useEffect(() => {
    servers.forEach((srv) => {
      listMcpAllowlist(srv.id).then((list) => {
        const global = list.find((r) => r.tool_name === "*")
        if (global) {
          setRules((prev) => ({ ...prev, [srv.id]: global }))
        }
      }).catch(() => {})
    })
  }, [servers])

  const handleDelete = async (serverId: string) => {
    try {
      await deleteMcpServer(serverId)
      refresh()
    } catch {
      console.error("Error al eliminar servidor MCP")
    }
  }

  const handleDisable = async (serverId: string) => {
    const existing = rules[serverId]
    try {
      const { upsertMcpAllowlist } = await import("@/api/mcp")
      await upsertMcpAllowlist({
        server_id: serverId,
        tool_name: "*",
        allowed: existing ? !existing.allowed : false,
        rate_limit: existing?.rate_limit ?? 60,
      })
      const list = await listMcpAllowlist(serverId)
      const global = list.find((r) => r.tool_name === "*")
      if (global) {
        setRules((prev) => ({ ...prev, [serverId]: global }))
      }
    } catch {
      console.error("Error al cambiar estado del servidor MCP")
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card/70">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div>
          <h4 className="text-sm font-semibold">Reglas MCP Router</h4>
          <p className="text-xs text-muted-foreground">
            Rust validará allowlist, schema y rate limit antes de usar tools.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-7" onClick={refresh}>
          <RefreshCwIcon className="size-4" />
          Validar
        </Button>
      </div>

      <div className="divide-y divide-border">
        {servers.map(server => {
          const rule = rules[server.id]
          const isActive = rule?.allowed ?? server.status === "online"
          const statusText = isActive ? "Activo" : server.status === "pending" ? "Pendiente" : "Inactivo"
          const rateText = rule?.rate_limit ? `${rule.rate_limit}/min` : isActive ? "60/min" : "30/min"

          return (
            <article key={server.id}
              className="grid gap-2 px-3 py-2 md:grid-cols-[9rem_minmax(0,1fr)_6rem_7rem_auto] md:items-center">
              <div>
                <p className="truncate text-sm font-medium">{server.name}</p>
                <p className="text-xs text-muted-foreground">{statusText}</p>
              </div>
              <code className="truncate font-mono text-xs text-muted-foreground">{server.url}</code>
              <span className="text-xs text-muted-foreground">{rateText}</span>
              <CheckRow label="Schema" checked={isActive} />
              <RowActions
                onEdit={() => onDialogChange({ type: "edit-mcp", name: server.name, serverId: server.id })}
                onDisable={() => handleDisable(server.id)}
                onDelete={() => handleDelete(server.id)}
              />
            </article>
          )
        })}
      </div>
    </div>
  )
}

function RowActions({ onEdit, onDisable, onDelete }: {
  onEdit: () => void; onDisable: () => void; onDelete: () => void
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon-xs" aria-label="Editar" onClick={onEdit}>
        <PencilIcon className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Desactivar" onClick={onDisable}>
        <XCircleIcon className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Eliminar" onClick={onDelete}>
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  )
}