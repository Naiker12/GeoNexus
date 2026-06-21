import * as React from "react"
import { BrainCircuitIcon } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"
import { ConfirmSettingsDialog } from "@/features/workspace/configuration/ConfirmSettingsDialog"
import { MapEngineDialog } from "@/features/workspace/configuration/MapEngineDialog"
import { McpSettingsDialog } from "@/features/workspace/configuration/McpSettingsDialog"
import { DialogActions } from "@/features/workspace/configuration/DialogActions"
import { CheckRow, Field } from "@/features/workspace/configuration/settings-ui"
import type { SettingsDialog } from "@/features/workspace/configuration/settings-types"

function ModelSettingsDialog({
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
    supportsEmbeddings?: boolean
  }
}) {
  const [provider, setProvider] = React.useState("")
  const [model, setModel] = React.useState("")
  const [endpoint, setEndpoint] = React.useState("")
  const [keychain, setKeychain] = React.useState("")
  const [isActive, setIsActive] = React.useState(true)
  const [supportsEmbeddings, setSupportsEmbeddings] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      if (editing && initialData) {
        setProvider(initialData.provider)
        setModel(initialData.model)
        setEndpoint(initialData.endpoint)
        setKeychain(initialData.key)
        setIsActive(initialData.status === "Activo")
        setSupportsEmbeddings(initialData.supportsEmbeddings ?? false)
      } else {
        setProvider("")
        setModel("")
        setEndpoint("")
        setKeychain("")
        setIsActive(true)
        setSupportsEmbeddings(false)
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
      supportsEmbeddings,
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
                placeholder="Proveedor"
                required
              />
            </Field>
            <Field label="Modelo">
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Modelo"
                required
              />
            </Field>
            <Field label="Endpoint">
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="Endpoint"
                required
              />
            </Field>
            <Field label="Keychain ref (opcional)">
              <Input
                value={keychain}
                onChange={(e) => setKeychain(e.target.value)}
                placeholder="Referencia keychain"
              />
            </Field>
          </div>
          <div className="flex items-center gap-2 mt-1 py-1">
            <CheckRow
              label="Activar este modelo al guardar"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <CheckRow
              label="Soporta embeddings"
              description="Activar si este proveedor tiene endpoint /embeddings compatible"
              checked={supportsEmbeddings}
              onCheckedChange={setSupportsEmbeddings}
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

function KeyReferenceDialog({
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
            keychain:{name.toLowerCase()} / clave protegida
          </code>
          <DialogActions submitLabel="Copiar referencia" onCancel={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SettingsDialogs({
  dialog,
  onOpenChange,
  models = [],
  onAdd = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onToggleStatus = () => {},
}: {
  dialog: SettingsDialog
  onOpenChange: (dialog: SettingsDialog) => void
  models?: {
    provider: string
    model: string
    endpoint: string
    key: string
    status: string
  }[]
  onAdd?: (model: any) => void
  onEdit?: (oldName: string, model: any) => void
  onDelete?: (name: string) => void
  onToggleStatus?: (name: string) => void
}) {
  const open = dialog !== null
  const close = (next: boolean) => !next && onOpenChange(null)

  if (!dialog) {
    return <Dialog open={open} onOpenChange={() => onOpenChange(null)} />
  }

  if (dialog.type === "add-model" || dialog.type === "edit-model") {
    const initialData = dialog.type === "edit-model"
      ? models.find((m) => m.provider === dialog.name)
      : undefined

    return (
      <ModelSettingsDialog
        open={open}
        name={dialog.type === "edit-model" ? dialog.name : undefined}
        editing={dialog.type === "edit-model"}
        onOpenChange={close}
        onAdd={onAdd}
        onEdit={onEdit}
        initialData={initialData}
      />
    )
  }

  if (dialog.type === "view-key") {
    return (
      <KeyReferenceDialog
        open={open}
        name={dialog.name}
        onOpenChange={close}
      />
    )
  }

  if (dialog.type === "edit-mcp") {
    return (
      <McpSettingsDialog
        open={open}
        name={dialog.name}
        serverId={dialog.serverId}
        onOpenChange={close}
        onSaved={() => onOpenChange(null)}
      />
    )
  }

  if (dialog.type === "configure-map") {
    return (
      <MapEngineDialog
        open={open}
        name={dialog.name}
        onOpenChange={close}
      />
    )
  }

  const handleConfirm = () => {
    if (dialog.type === "delete-model") {
      onDelete(dialog.name)
    } else if (dialog.type === "disable-model") {
      onToggleStatus(dialog.name)
    }
  }

  return (
    <ConfirmSettingsDialog
      open={open}
      name={dialog.name}
      isDelete={dialog.type === "delete-model" || dialog.type === "delete-mcp"}
      isMcp={dialog.type === "delete-mcp" || dialog.type === "disable-mcp"}
      onOpenChange={close}
      onConfirm={handleConfirm}
    />
  )
}
