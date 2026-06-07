import * as React from "react"
import { BrainCircuitIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"
import { DialogActions } from "@/features/workspace/configuration/DialogActions"
import { CheckRow, Field } from "@/features/workspace/configuration/settings-ui"

export function ModelSettingsDialog({
  open,
  name,
  editing,
  onOpenChange,
  onAdd,
  onEdit,
  initialData,
}: {
  open: boolean
  name?: string
  editing: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (model: any) => void
  onEdit: (oldName: string, model: any) => void
  initialData?: {
    provider: string
    model: string
    endpoint: string
    key: string
    status: string
  }
}) {
  const [provider, setProvider] = React.useState("")
  const [model, setModel] = React.useState("")
  const [endpoint, setEndpoint] = React.useState("")
  const [keychain, setKeychain] = React.useState("")
  const [isActive, setIsActive] = React.useState(true)

  React.useEffect(() => {
    if (open) {
      if (editing && initialData) {
        setProvider(initialData.provider)
        setModel(initialData.model)
        setEndpoint(initialData.endpoint)
        setKeychain(initialData.key)
        setIsActive(initialData.status === "Activo")
      } else {
        setProvider("")
        setModel("")
        setEndpoint("")
        setKeychain("")
        setIsActive(true)
      }
    }
  }, [open, editing, initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!provider || !model || !endpoint) return

    const payload = {
      provider,
      model,
      endpoint,
      key: keychain || "Sin clave",
      status: isActive ? "Activo" : "Inactivo",
    }

    if (editing && name) {
      onEdit(name, payload)
    } else {
      onAdd(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,42rem)] rounded-lg p-0 bg-background border border-border">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-start gap-2.5 pr-8">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BrainCircuitIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold">
                {editing ? `Editar ${name}` : "Agregar modelo IA"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-5">
                Configura proveedor, endpoint, modelo y referencia de clave.
                La clave real se guardará en keychain por Tauri.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form className="grid gap-3 p-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Proveedor">
              <Input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="OpenRouter"
                required
              />
            </Field>
            <Field label="Modelo">
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="claude-3.5-sonnet"
                required
              />
            </Field>
            <Field label="Endpoint">
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
                required
              />
            </Field>
            <Field label="Keychain ref (opcional)">
              <Input
                value={keychain}
                onChange={(e) => setKeychain(e.target.value)}
                placeholder="keychain: openrouter"
              />
            </Field>
          </div>
          <div className="flex items-center gap-2 mt-1 py-1">
            <CheckRow
              label="Activar este modelo al guardar"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
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
      <DialogContent className="w-[min(94vw,34rem)] rounded-lg p-0 bg-background border border-border">
        <DialogHeader className="mb-0 border-b border-border px-4 pb-3 pt-4">
          <DialogTitle className="text-base font-semibold">
            Clave guardada de {name}
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs leading-5">
            Vista segura de referencia. El valor real se recuperará desde
            keychain con permiso del usuario.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 p-4">
          <code className="rounded-lg border border-border bg-[#090a0c] p-3 font-mono text-xs text-slate-300">
            keychain:{name.toLowerCase()} / sk-****************
          </code>
          <DialogActions submitLabel="Copiar referencia" onCancel={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
