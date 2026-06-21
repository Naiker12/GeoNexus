import * as React from "react"

import { Dialog } from "@/components/ui/dialog"
import { MapEngineDialog } from "@/features/workspace/configuration/MapEngineDialog"
import { McpSettingsDialog } from "@/features/workspace/configuration/McpSettingsDialog"
import type { SettingsDialog } from "@/features/workspace/configuration/settings-types"

export function SettingsDialogs({
  dialog,
  onOpenChange,
}: {
  dialog: SettingsDialog
  onOpenChange: (dialog: SettingsDialog) => void
}) {
  if (!dialog) {
    return null
  }

  const close = () => onOpenChange(null)

  if (dialog.type === "edit-mcp") {
    return (
      <McpSettingsDialog
        open
        name={dialog.name}
        serverId={dialog.serverId}
        onOpenChange={close}
        onSaved={close}
      />
    )
  }

  if (dialog.type === "configure-map") {
    return (
      <MapEngineDialog
        open
        name={dialog.name}
        onOpenChange={close}
      />
    )
  }

  return null
}
