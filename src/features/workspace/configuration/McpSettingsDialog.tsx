import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NativeSelect } from "@/components/ui/native-select"
import { DialogActions } from "@/features/workspace/configuration/DialogActions"
import { CheckRow, Field } from "@/features/workspace/configuration/settings-ui"
import { upsertMcpAllowlist, listMcpAllowlist } from "@/api/mcp"

export function McpSettingsDialog({
  open,
  name,
  serverId,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  name: string
  serverId: string
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const [allowed, setAllowed] = React.useState(true)
  const [rateLimit, setRateLimit] = React.useState("60/min")
  const [requireSchema, setRequireSchema] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const rateValue = React.useMemo(() => {
    const match = rateLimit.match(/^(\d+)/)
    return match ? Number(match[1]) : 60
  }, [rateLimit])

  React.useEffect(() => {
    if (!open || !serverId) return
    listMcpAllowlist(serverId).then((rules) => {
      const global = rules.find((r) => r.tool_name === "*")
      if (global) {
        setAllowed(global.allowed)
        if (global.rate_limit) {
          setRateLimit(`${global.rate_limit}/min`)
        }
      }
    }).catch(() => {})
  }, [open, serverId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await upsertMcpAllowlist({
        server_id: serverId,
        tool_name: "*",
        allowed,
        rate_limit: rateValue,
      })
      onSaved?.()
      onOpenChange(false)
    } catch {
      console.error("Error al guardar regla MCP")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,38rem)] rounded-lg p-0">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <DialogTitle className="text-base">
            Editar regla MCP: {name}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-5">
            Ajusta allowlist, rate limit y validacion de schema para el router
            Rust.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3 p-4" onSubmit={handleSubmit}>
          <Field label="Allowlist">
            <input
              type="text"
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-primary/30 focus-visible:ring-2"
              placeholder="localhost:7021"
              disabled
            />
          </Field>
          <Field label="Rate limit">
            <NativeSelect
              className="w-full"
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
            >
              <option value="60/min">60/min</option>
              <option value="30/min">30/min</option>
              <option value="10/min">10/min</option>
            </NativeSelect>
          </Field>
          <CheckRow
            label="Exigir schema validado"
            checked={requireSchema}
            onCheckedChange={setRequireSchema}
          />
          <CheckRow
            label="Permitir acceso al servidor"
            checked={allowed}
            onCheckedChange={setAllowed}
          />
          <DialogActions
            submitLabel={saving ? "Guardando..." : "Actualizar regla"}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}