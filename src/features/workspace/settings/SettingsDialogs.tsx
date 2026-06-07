import { Dialog } from "@/components/ui/dialog"
import { ConfirmSettingsDialog } from "@/features/workspace/settings/ConfirmSettingsDialog"
import { MapEngineDialog } from "@/features/workspace/settings/MapEngineDialog"
import { McpSettingsDialog } from "@/features/workspace/settings/McpSettingsDialog"
import {
  KeyReferenceDialog,
  ModelSettingsDialog,
} from "@/features/workspace/settings/ModelSettingsDialogs"
import type { SettingsDialog } from "@/features/workspace/settings/settings-types"

export function SettingsDialogs({
  dialog,
  onOpenChange,
}: {
  dialog: SettingsDialog
  onOpenChange: (dialog: SettingsDialog) => void
}) {
  const open = dialog !== null
  const close = (next: boolean) => !next && onOpenChange(null)

  if (!dialog) {
    return <Dialog open={open} onOpenChange={() => onOpenChange(null)} />
  }

  if (dialog.type === "add-model" || dialog.type === "edit-model") {
    return (
      <ModelSettingsDialog
        open={open}
        name={dialog.type === "edit-model" ? dialog.name : undefined}
        editing={dialog.type === "edit-model"}
        onOpenChange={close}
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
        onOpenChange={close}
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

  return (
    <ConfirmSettingsDialog
      open={open}
      name={dialog.name}
      isDelete={dialog.type === "delete-model" || dialog.type === "delete-mcp"}
      isMcp={dialog.type === "delete-mcp" || dialog.type === "disable-mcp"}
      onOpenChange={close}
    />
  )
}
