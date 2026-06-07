import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"
import { NativeSelect } from "@/components/ui/native-select"
import { DialogActions } from "@/features/workspace/configuration/DialogActions"
import { CheckRow, Field } from "@/features/workspace/configuration/settings-ui"

export function McpSettingsDialog({
  open,
  name,
  onOpenChange,
}: {
  open: boolean
  name: string
  onOpenChange: (open: boolean) => void
}) {
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
        <form className="grid gap-3 p-4">
          <Field label="Allowlist">
            <Input placeholder="localhost:7021" />
          </Field>
          <Field label="Rate limit">
            <NativeSelect className="w-full">
              <option>60/min</option>
              <option>30/min</option>
              <option>10/min</option>
            </NativeSelect>
          </Field>
          <CheckRow label="Exigir schema validado" checked />
          <DialogActions submitLabel="Actualizar regla" onCancel={() => onOpenChange(false)} />
        </form>
      </DialogContent>
    </Dialog>
  )
}
