import {
  EyeIcon,
  PencilIcon,
  RefreshCwIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react"

import { Button } from "@/components/ui/Button"
import type { SettingsDialog } from "@/features/workspace/configuration/settings-types"
import { CheckRow } from "@/features/workspace/configuration/settings-ui"

const mcpRules = [
  {
    server: "QGIS MCP",
    allowlist: "localhost:7021",
    rate: "60/min",
    status: "Activo",
  },
  {
    server: "Memory MCP",
    allowlist: "localhost:7011",
    rate: "60/min",
    status: "Activo",
  },
  {
    server: "ArcGIS MCP",
    allowlist: "localhost:7041",
    rate: "30/min",
    status: "Pendiente",
  },
]

export function McpRulesTable({
  onDialogChange,
}: {
  onDialogChange: (dialog: SettingsDialog) => void
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card/70">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div>
          <h4 className="text-sm font-semibold">Reglas MCP Router</h4>
          <p className="text-xs text-muted-foreground">
            Rust validara allowlist, schema y rate limit antes de usar tools.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-7">
          <RefreshCwIcon className="size-4" />
          Validar
        </Button>
      </div>
      <div className="divide-y divide-border">
        {mcpRules.map((rule) => (
          <article
            key={rule.server}
            className="grid gap-2 px-3 py-2 md:grid-cols-[9rem_minmax(0,1fr)_6rem_7rem_auto] md:items-center"
          >
            <div>
              <p className="truncate text-sm font-medium">{rule.server}</p>
              <p className="text-xs text-muted-foreground">{rule.status}</p>
            </div>
            <code className="truncate font-mono text-xs text-muted-foreground">
              {rule.allowlist}
            </code>
            <span className="text-xs text-muted-foreground">{rule.rate}</span>
            <CheckRow label="Schema" checked />
            <RowActions
              onView={() =>
                onDialogChange({ type: "edit-mcp", name: rule.server })
              }
              onEdit={() =>
                onDialogChange({ type: "edit-mcp", name: rule.server })
              }
              onDisable={() =>
                onDialogChange({ type: "disable-mcp", name: rule.server })
              }
              onDelete={() =>
                onDialogChange({ type: "delete-mcp", name: rule.server })
              }
            />
          </article>
        ))}
      </div>
    </div>
  )
}

function RowActions({
  onView,
  onEdit,
  onDisable,
  onDelete,
}: {
  onView: () => void
  onEdit: () => void
  onDisable: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon-xs" aria-label="Ver regla" onClick={onView}>
        <EyeIcon className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Editar" onClick={onEdit}>
        <PencilIcon className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Desactivar"
        onClick={onDisable}
      >
        <XCircleIcon className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Eliminar"
        onClick={onDelete}
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  )
}
