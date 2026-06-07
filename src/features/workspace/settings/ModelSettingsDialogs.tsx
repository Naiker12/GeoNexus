import { BrainCircuitIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"
import { DialogActions } from "@/features/workspace/settings/DialogActions"
import { CheckRow, Field } from "@/features/workspace/settings/settings-ui"

export function ModelSettingsDialog({
  open,
  name,
  editing,
  onOpenChange,
}: {
  open: boolean
  name?: string
  editing: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,42rem)] rounded-lg p-0">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BrainCircuitIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base">
                {editing ? `Editar ${name}` : "Agregar modelo IA"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5">
                Configura proveedor, endpoint, modelo y referencia de clave.
                La clave real se guardara en keychain por Tauri.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form className="grid gap-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Proveedor">
              <Input defaultValue={editing ? name : ""} placeholder="OpenRouter" />
            </Field>
            <Field label="Modelo">
              <Input placeholder="claude / gpt / gemini" />
            </Field>
            <Field label="Endpoint">
              <Input placeholder="https://openrouter.ai/api/v1" />
            </Field>
            <Field label="Keychain ref">
              <Input placeholder="keychain: openrouter" />
            </Field>
          </div>
          <CheckRow label="Activar este modelo al guardar" checked={!editing} />
          <DialogActions
            submitLabel={editing ? "Actualizar modelo" : "Agregar modelo"}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function KeyReferenceDialog({
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
      <DialogContent className="w-[min(94vw,34rem)] rounded-lg p-0">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <DialogTitle className="text-base">
            Clave guardada de {name}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-5">
            Vista segura de referencia. El valor real se recuperara desde
            keychain con permiso del usuario.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 p-4">
          <code className="rounded-lg border border-border bg-background p-3 font-mono text-sm">
            keychain:{name.toLowerCase()} / sk-****************
          </code>
          <DialogActions submitLabel="Copiar referencia" onCancel={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
