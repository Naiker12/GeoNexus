import { Dialog } from "@/components/ui/dialog"
import { ConfirmSettingsDialog } from "@/features/workspace/configuration/ConfirmSettingsDialog"
import { MapEngineDialog } from "@/features/workspace/configuration/MapEngineDialog"
import { McpSettingsDialog } from "@/features/workspace/configuration/McpSettingsDialog"
import {
  KeyReferenceDialog,
  ModelSettingsDialog,
} from "@/features/workspace/configuration/ModelSettingsDialogs"
import type { SettingsDialog } from "@/features/workspace/configuration/settings-types"

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
